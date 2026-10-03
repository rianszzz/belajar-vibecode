import React, { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

const initial = { items: [], discount: 0 }

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { product } = action
      const found = state.items.find((i) => i.uuid === product.uuid)
      const qtyInCart = found ? found.qty : 0
      if (qtyInCart + 1 > product.stock) return state // guard stok
      if (found) {
        return { ...state, items: state.items.map((i) => (i.uuid === product.uuid ? { ...i, qty: i.qty + 1 } : i)) }
      }
      return { ...state, items: [...state.items, { uuid: product.uuid, name: product.name, price: product.price, qty: 1 }] }
    }
    case 'setQty': {
      const { uuid, qty } = action
      if (qty <= 0) return { ...state, items: state.items.filter((i) => i.uuid !== uuid) }
      const item = state.items.find((i) => i.uuid === uuid)
      if (item && qty > item.stock) return state
      return { ...state, items: state.items.map((i) => (i.uuid === uuid ? { ...i, qty, stock: qty > i.qty ? i.stock : i.stock } : i)) }
    }
    case 'remove':
      return { ...state, items: state.items.filter((i) => i.uuid !== action.uuid) }
    case 'discount':
      return { ...state, discount: action.value }
    case 'clear':
      return initial
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)
  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
