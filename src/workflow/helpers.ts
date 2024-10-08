import { Selections } from "../types.js";
import { TemplateProjectType } from "../utils/constants.js";

export const needTemplateChoice = (prev: any) => {
  switch (prev) {
    case TemplateProjectType.MOVE:
      return null;
    default:
      return "select";
  }
};

export const needSigningOptionChoice = (prev: any) => {
  switch (prev) {
    default:
      return null;
  }
};

export const needSurfChoice = (values: Selections) => {
  if (values.projectType === TemplateProjectType.MOVE) {
    return null;
  }

  if (values.template.path === "boilerplate-template") {
    return "select";
  }

  return null;
};

export const needFrameworkChoice = (prev: any) => {
  switch (prev) {
    case TemplateProjectType.MOVE:
      return null;
    default:
      return "select";
  }
};
