"use client";
import React, { useMemo } from "react";

// useCategories categories fetch kar rha hai 
import { useCategories } from "../../hooks/useCategories";

// renderCategoryOptions ui helper code hai
import { renderCategoryOptions } from "../../utils/categoryRender";


const CategorySelect = ({ value, onChange = () => {} }) => {

    
  const { categories, loading, error } = useCategories();

    
  const options = useMemo(
    () => renderCategoryOptions(categories),
    [categories]
  );


  
  if (error) return <p>Failed to load categories</p>;

  return (
    <div>
      <label>Category</label>

      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">Select Category</option>

        {options.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategorySelect;
