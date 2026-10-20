import { BUTTON } from "@/components/styles";
import { SwatchSmear } from "@/features/swatch/SwatchSmear";
import { seedOf, smearFinish } from "@/features/swatch/smear";
import type { Product } from "@/types/product";

const FINISH_LABEL: Record<Product["finish"], string> = {
  matte: "매트",
  glossy: "글로시",
  velvet: "벨벳",
  cream: "크림",
  powder: "파우더",
  liquid: "리퀴드",
};

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <li className="flex items-center gap-3.5 py-3.5">
      <SwatchSmear color={product.hex} width={48} height={48} finish={smearFinish(product.finish)} seed={seedOf(product.id)} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-muted">{product.brand}</p>
        <p className="truncate text-[15px] font-medium">{product.name}</p>
        <p className="text-[13px] text-muted">
          {product.shade} · {FINISH_LABEL[product.finish]}
        </p>
      </div>
      <a
        href={product.url}
        target="_blank"
        rel="sponsored noopener"
        data-umami-event="product-click"
        data-umami-event-id={product.id}
        className={BUTTON.small}
      >
        쿠팡에서 보기
      </a>
    </li>
  );
}
