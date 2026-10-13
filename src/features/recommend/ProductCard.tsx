import type { Product } from "@/types/product";

const FINISH_LABEL: Record<Product["finish"], string> = { matte: "매트", glossy: "글로시", velvet: "벨벳" };

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
      <span aria-hidden="true" className="size-12 shrink-0 rounded-full border border-black/10" style={{ background: product.hex }} />
      <div className="min-w-0 flex-1">
        {product.brand && <p className="text-xs text-muted">{product.brand}</p>}
        <p className="truncate font-medium">{product.name}</p>
        <p className="text-sm text-muted">
          {product.shade} · {FINISH_LABEL[product.finish]}
        </p>
      </div>
      <a
        href={product.url}
        target="_blank"
        rel="sponsored noopener"
        className="shrink-0 rounded-full bg-accent-soft px-3 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        쿠팡에서 보기
      </a>
    </li>
  );
}
