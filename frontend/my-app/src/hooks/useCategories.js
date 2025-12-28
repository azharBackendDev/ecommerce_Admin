import { useEffect, useState } from "react";
import api from "../lib/apiClient";

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchCategories() {
      try {
        const res = await api.get("/categories/category-tree");
        console.log("Tree based api data fetching for cheacking purpose", res?.data);
        
        if (mounted) {
          setCategories(res?.data || []);
        }
      } catch (err) {
        console.error("Category fetch failed", err);
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchCategories();
    return () => { mounted = false; };
  }, []);

  return { categories, loading, error };
}
