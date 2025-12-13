import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export const connectSupabase = () => {
    if(!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY){
        console.error("Supabase config missing");
        process.exit(1);
    }
    console.log("Supabase Connected");
}