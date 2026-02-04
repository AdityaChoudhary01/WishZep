
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  category: string;
  description: string;
  badge?: string;
  rating: number;
  variants?: {
    sizes: string[];
    colors: string[];
  };
}

interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, size?: string, color?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, size, color) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (item) => item.id === product.id && item.selectedSize === size && item.selectedColor === color
        );

        // Ensure we use the effective price for the cart
        const effectivePrice = product.discountPrice && product.discountPrice > 0 
          ? product.discountPrice 
          : product.price;

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id && item.selectedSize === size && item.selectedColor === color
                ? { ...item, quantity: item.quantity + 1, price: effectivePrice }
                : item
            ),
          });
        } else {
          set({ 
            items: [
              ...currentItems, 
              { ...product, price: effectivePrice, quantity: 1, selectedSize: size, selectedColor: color }
            ] 
          });
        }
      },
      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },
      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'wishzep-cart',
    }
  )
);
