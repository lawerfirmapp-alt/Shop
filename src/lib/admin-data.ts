import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Department, OrderLine, Product } from "@/lib/catalog";

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  items: OrderLine[];
  total: number;
  status: string;
  created_at: string;
}

export interface StaffMember {
  id: string;
  full_name: string;
  role_title: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
}

const must = <T,>(r: { data: T | null; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export const adminProductsQuery = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: async () =>
    must(await supabase.from("products").select("*").order("created_at", { ascending: false })).map((p) => ({
      ...p,
      price: Number(p.price),
    })) as Product[],
});

export const adminDepartmentsQuery = queryOptions({
  queryKey: ["admin", "departments"],
  queryFn: async () => must(await supabase.from("departments").select("*").order("sort_order")) as Department[],
});

export const adminOrdersQuery = queryOptions({
  queryKey: ["admin", "orders"],
  queryFn: async () =>
    (must(await supabase.from("orders").select("*").order("created_at", { ascending: false })) as unknown as Order[]).map(
      (o) => ({ ...o, total: Number(o.total) }),
    ),
});

export const adminStaffQuery = queryOptions({
  queryKey: ["admin", "staff"],
  queryFn: async () => must(await supabase.from("staff").select("*").order("full_name")) as StaffMember[],
});
