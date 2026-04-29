export type WidgetDataState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export type WidgetProps<T> = {
  state: WidgetDataState<T>;
  refresh: () => void;
};

