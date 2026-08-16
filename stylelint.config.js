export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "selector-class-pattern": null,
    "custom-property-pattern": null,
    "custom-property-empty-line-before": null,
    "color-function-notation": null,
    "alpha-value-notation": null,
    "color-hex-length": null,
    "value-keyword-case": null,
    "media-feature-range-notation": null,
    "rule-empty-line-before": null,
    "property-no-deprecated": null,
    "no-descending-specificity": null,
    "declaration-block-single-line-max-declarations": null,
    "declaration-block-no-redundant-longhand-properties": null,
    "color-no-hex": true
  },
  overrides: [
    {
      files: ["src/design/tokens.css", "src/design/brand.css", "src/design/worlds.css"],
      rules: { "color-no-hex": null }
    }
  ]
};
