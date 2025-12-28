export function renderCategoryOptions(categories, level = 0) {
  return categories.flatMap(cat => {
    const current = {
      id: cat._id,
      label: `${"— ".repeat(level)}${cat.name}`
    };

    const children = cat.children?.length
      ? renderCategoryOptions(cat.children, level + 1)
      : [];

    return [current, ...children];
  });
}
