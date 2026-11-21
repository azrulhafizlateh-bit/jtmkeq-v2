import { createCn } from "cn/config";

/**
 * Class merger that knows the design-system font-size tokens (DESIGN.md §3,
 * defined in app/globals.css). Without this, `text-small` would be mistaken
 * for a text colour and conflict with colour classes.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "body", "table", "small", "label"] }],
    },
  },
});
