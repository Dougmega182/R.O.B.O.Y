import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    
    if (!res.ok) throw new Error("Failed to fetch page");
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    let recipeData: any = {
      ingredients: [],
      instructions: "",
      partial: false
    };

    // 1. Look for JSON-LD (Standard for Recipes)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).text());
        const findRecipe = (obj: any): any => {
          if (!obj) return null;
          if (obj["@type"] === "Recipe") return obj;
          if (Array.isArray(obj["@type"]) && obj["@type"].includes("Recipe")) return obj;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const r = findRecipe(item);
              if (r) return r;
            }
          }
          if (obj["@graph"] && Array.isArray(obj["@graph"])) {
            return findRecipe(obj["@graph"]);
          }
          return null;
        };
        
        const recipe = findRecipe(json);
        if (recipe) {
          // Extract image
          let image = "";
          if (Array.isArray(recipe.image)) {
            image = typeof recipe.image[0] === 'string' ? recipe.image[0] : recipe.image[0]?.url || "";
          } else if (typeof recipe.image === 'string') {
            image = recipe.image;
          } else if (recipe.image?.url) {
            image = recipe.image.url;
          }

          // Extract instructions
          let instructions = "";
          if (Array.isArray(recipe.recipeInstructions)) {
            instructions = recipe.recipeInstructions
              .map((i: any) => {
                if (typeof i === 'string') return i;
                if (i["@type"] === "HowToSection") {
                  const sectionSteps = Array.isArray(i.itemListElement)
                    ? i.itemListElement.map((s: any) => s.text || s.name || '').join("\n\n")
                    : '';
                  return `## ${i.name || 'Section'}\n\n${sectionSteps}`;
                }
                return i.text || i.name || '';
              })
              .filter((s: string) => s.trim())
              .join("\n\n");
          } else if (typeof recipe.recipeInstructions === 'string') {
            instructions = recipe.recipeInstructions;
          }

          recipeData = {
            name: recipe.name,
            description: recipe.description,
            image,
            ingredients: Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [],
            instructions,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            partial: false
          };
        }
      } catch (e) {
        console.error("JSON-LD parse error:", e);
      }
    });

    // 1b. Search for __NEXT_DATA__ (Common in Marley Spoon, HelloFresh, etc.)
    if (recipeData.ingredients.length === 0) {
      $('script#__NEXT_DATA__').each((_, el) => {
        try {
          const json = JSON.parse($(el).text());
          // Marley Spoon / HelloFresh specific paths in NEXT_DATA
          const pageProps = json.props?.pageProps;
          const recipe = pageProps?.recipe || pageProps?.initialState?.recipe || pageProps?.ssrRecipe;
          
          if (recipe) {
            recipeData.name = recipe.title || recipe.name || recipeData.name;
            recipeData.image = recipe.image?.url || recipe.main_image?.url || recipeData.image;
            recipeData.ingredients = recipe.ingredients?.map((i: any) => {
              if (typeof i === 'string') return i;
              return `${i.amount || ''} ${i.unit || i.unit_name || ''} ${i.name || ''}`.trim();
            }) || recipeData.ingredients;
            recipeData.instructions = recipe.steps?.map((s: any) => s.description || s.text || '').join("\n\n") || recipeData.instructions;
            recipeData.partial = false;
          }
        } catch (e) {
          console.error("NEXT_DATA parse error:", e);
        }
      });
    }

    // 1c. Specialized Fallbacks for JS-rendered sites (Marley Spoon Fallback)
    if (recipeData.ingredients.length === 0 || !recipeData.instructions) {
      // Marley Spoon DOM Fallback
      const msTitle = $('h1.dish-detail__title').text().trim();
      if (msTitle) recipeData.name = msTitle;

      if (recipeData.ingredients.length === 0) {
        $('ul.recipe-ingredients__list li').each((_, el) => {
          const text = $(el).text().trim().replace(/\s+/g, ' ');
          if (text) recipeData.ingredients.push(text);
        });
      }

      if (!recipeData.instructions) {
        const steps: string[] = [];
        $('div.recipe-step').each((_, el) => {
          const title = $(el).find('.recipe-step__title').text().trim();
          const desc = $(el).find('.recipe-step__description').text().trim();
          if (desc) steps.push(title ? `## ${title}\n${desc}` : desc);
        });
        if (steps.length > 0) recipeData.instructions = steps.join("\n\n");
      }
    }

    // 2. Fallback: Scrape from common recipe plugin HTML (WP Recipe Maker, Tasty, etc.)
    if (!recipeData.instructions || recipeData.ingredients.length === 0) {
      // Try WP Recipe Maker
      if (recipeData.ingredients.length === 0) {
        $('.wprm-recipe-ingredient').each((_, el) => {
          const text = $(el).text().trim().replace(/\s+/g, ' ');
          if (text) recipeData.ingredients.push(text);
        });
      }
      if (!recipeData.instructions) {
        const instructions: string[] = [];
        $('.wprm-recipe-instruction-text, .wprm-recipe-instruction .wprm-recipe-instruction-text').each((_, el) => {
          const text = $(el).text().trim();
          if (text) instructions.push(text);
        });
        if (instructions.length > 0) recipeData.instructions = instructions.join("\n\n");
      }

      // Try Tasty Recipes
      if (recipeData.ingredients.length === 0) {
        $('.tasty-recipe-ingredients li').each((_, el) => {
          const text = $(el).text().trim();
          if (text) recipeData.ingredients.push(text);
        });
      }
      if (!recipeData.instructions) {
        const instructions: string[] = [];
        $('.tasty-recipe-instructions li, .tasty-recipe-instructions p').each((_, el) => {
          const text = $(el).text().trim();
          if (text) instructions.push(text);
        });
        if (instructions.length > 0) recipeData.instructions = instructions.join("\n\n");
      }

      // Try generic recipe card selectors
      if (recipeData.ingredients.length === 0) {
        $('[class*="ingredient"] li, [class*="ingredient-list"] li').each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length < 200) recipeData.ingredients.push(text);
        });
      }
    }

    // 3. Always ensure we have name + image from OG tags as a baseline
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogDesc = $('meta[property="og:description"]').attr("content") 
      || $('meta[name="description"]').attr("content") || "";
    const pageTitle = $("title").text() || "";
    
    if (!recipeData.name) {
      const genericTitlePatterns = /menu|what's on|this week|home|welcome|login/i;
      const cleanTitle = (t: string) => t.split(/\s+[|\-–—]\s+/)[0].trim(); // Only split on padded separators
      
      if (ogTitle && !genericTitlePatterns.test(ogTitle)) {
        recipeData.name = cleanTitle(ogTitle);
      } else if (ogDesc && ogDesc.length < 120) {
        recipeData.name = cleanTitle(ogDesc);
      } else {
        recipeData.name = cleanTitle(pageTitle);
      }
      
      if (!recipeData.name || genericTitlePatterns.test(recipeData.name)) {
        recipeData.name = ogDesc.length < 120 ? ogDesc : (ogTitle || pageTitle);
      }
    }
    
    if (!recipeData.image) {
      recipeData.image = $('meta[property="og:image"]').attr("content")
        || $('meta[name="twitter:image"]').attr("content");
    }
    if (!recipeData.description) {
      recipeData.description = (ogDesc && ogDesc !== recipeData.name) ? ogDesc : "";
    }

    // 4. Mark as partial if we couldn't get the full recipe (JS-rendered sites like Marley Spoon)
    if (recipeData.ingredients.length === 0 && !recipeData.instructions) {
      recipeData.partial = true;
    }

    return NextResponse.json(recipeData);
  } catch (error: any) {
    console.error("Scrape Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
