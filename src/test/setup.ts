import '@testing-library/jest-dom/vitest';

// jsdom has no layout: stub what the app calls for smooth scrolling.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
