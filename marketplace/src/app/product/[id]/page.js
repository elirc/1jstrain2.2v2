import ProductDetail from "@/components/ProductDetail";

export default async function ProductPage({ params }) {
  const resolved = await params;
  return <ProductDetail productId={resolved.id} />;
}

