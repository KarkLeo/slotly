// @ts-check

const hex = /(^|[^\w&/])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])/i;
const colorFunction = /(^|[^\w-])(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/i;
const utilities =
  "bg|text|border(?:-[xytrbl])?|ring(?:-offset)?|outline|fill|stroke|decoration|shadow|from|via|to|caret|accent|placeholder|divide";
const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const paletteClass = new RegExp(
  `(?:^|[\\s:])!?(?:${utilities})-(?:(?:${palette})-(?:50|[1-9]00|950)|white|black)(?:\\/\\d+)?(?![\\w-])`,
);
const styleColorProps = new Set([
  "color",
  "background",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
  "boxShadow",
  "textDecorationColor",
  "caretColor",
]);
const allowedStyleValue =
  /^(?:var\(--|currentColor$|transparent$|inherit$|none$)/;

/** @param {any} node */
function isStyleColorValue(node) {
  const property = node.parent;
  if (property?.type !== "Property" || property.value !== node) return false;
  const key =
    property.key.type === "Identifier" ? property.key.name : property.key.value;
  if (!styleColorProps.has(key)) return false;
  const object = property.parent;
  const container = object?.parent;
  const attribute = container?.parent;
  return (
    object?.type === "ObjectExpression" &&
    container?.type === "JSXExpressionContainer" &&
    attribute?.type === "JSXAttribute" &&
    attribute.name.name === "style"
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow hardcoded colors; use semantic tokens" },
    schema: [],
    messages: {
      hex: "Hex color in code; use a semantic token utility (bg-primary, text-destructive, …).",
      colorFunction:
        "Color function in code; use a semantic token utility (bg-primary, text-destructive, …).",
      palette:
        "Tailwind palette color; use a semantic token utility (bg-primary, text-muted-foreground, …).",
      styleColor:
        "Inline style color must be var(--token), currentColor, transparent, inherit or none.",
    },
  },
  create(context) {
    /** @param {import("eslint").Rule.Node} node @param {string} text */
    function check(node, text) {
      if (hex.test(text)) context.report({ node, messageId: "hex" });
      else if (colorFunction.test(text))
        context.report({ node, messageId: "colorFunction" });
      else if (paletteClass.test(text))
        context.report({ node, messageId: "palette" });
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (isStyleColorValue(node)) {
          if (!allowedStyleValue.test(node.value))
            context.report({ node, messageId: "styleColor" });
          return;
        }
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};

export default rule;
