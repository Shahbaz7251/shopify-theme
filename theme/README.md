# Storefront theme

A fast Shopify Online Store 2.0 theme with no libraries or stylesheet files. Built on Shopify's [Skeleton theme](https://github.com/Shopify/skeleton-theme). All text is sample content, so replace it in the theme editor.

## Work on it

```bash
cd theme
shopify theme check
shopify theme dev --store <store>.myshopify.com
```

Add it to a store as an unpublished theme:

```bash
shopify theme push --store <store>.myshopify.com --unpublished
```

## First setup

1. Upload your images and pick your collections in each homepage section. They start empty.
2. Theme settings → Contact: add your WhatsApp number and email. The WhatsApp button stays hidden until a number is set.
3. Theme settings → Delivery: set the free-delivery threshold, dispatch and delivery days, return days and cash on delivery.
4. Theme settings → Brand: add your logo and favicon.
5. Replace the sample reviews, FAQ answers and promises with your own.

The sample reviews must be replaced or removed before launch.

## Product data the theme reads

- A variant option named **Size** with inches in the value, e.g. `Small (12")`, powers the size check.
- Metafields `custom.dimensions`, `custom.material`, `custom.finish`, `custom.care`, `custom.short_fact`.
- A reviews app's `reviews.rating` and `reviews.rating_count` show the review link near the title.

## Apps

Any OS2 reviews app with app blocks works. Add its review widget to the "Reviews & questions" section of the product template.

## CSS

Global styles live in `snippets/base-styles.liquid` and are inlined in `<head>`. Each section keeps its own CSS in a `<style>` tag at the top of its file, which keeps render-blocking requests off the critical path on mobile.
