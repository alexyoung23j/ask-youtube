/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { ComponentType } from "./types";

export type StyleAttrs = {
  className?: string;
  disabled?: boolean;
};

// Use !important on things in the className css you provide, if you provide it
export function getClassName(
  componentName: ComponentType,
  styles: { [key: string]: string },
  props: { [key: string]: any },
  className?: string
) {
  // Get default className
  const classNames = [styles[componentName]];

  if (props) {
    Object.keys(props).forEach((key) => {
      if (props[key] && styles[`${componentName}--${props[key]}`]) {
        classNames.push(styles[`${componentName}--${props[key]}`]);
      }
    });
  }

  if (className) {
    classNames.push(className);
  }

  return classNames.join(" ");
}
