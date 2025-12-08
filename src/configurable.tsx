import { assert } from "./utils";

export type Configurable<T, Config> = {
  type: "configurable";
  withConfig: (config: Config) => T;
} & ConfigurableProps<Config>;

export type ConfigurableProps<Config> = {
  defaultConfig: Config;
  ConfigPanel: React.ComponentType<ConfigPanelProps<Config>>;
};

export interface ConfigPanelProps<Config> {
  config: Config;
  setConfig: (newConfig: Config) => void;
}

export function configurable<T, Config>(
  props: ConfigurableProps<Config>,
  withConfig: (config: Config) => T
): Configurable<T, Config> {
  return {
    type: "configurable",
    withConfig,
    defaultConfig: props.defaultConfig,
    ConfigPanel: props.ConfigPanel,
  };
}

export function ConfigCheckbox({
  label,
  value,
  onChange,
  children,
}: {
  label?: string;
  value: boolean;
  onChange: (newValue: boolean) => void;
  children?: React.ReactNode;
}) {
  assert(!(label && children), "Provide either label or children, not both");
  return (
    <label className="flex items-start gap-2 text-xs">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label ?? children}</span>
    </label>
  );
}
