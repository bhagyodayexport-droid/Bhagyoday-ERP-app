import { Product } from '../types';
import { PricingUnit, convertRate, convertWidth, calculateItemTotal, convertDimension } from './unitConverter';

export type QuotationAction =
  | { type: 'ADD_ITEM'; payload: Partial<Product> }
  | { type: 'REMOVE_ITEM'; index: number }
  | { type: 'DUPLICATE_ITEM'; index: number }
  | { type: 'MOVE_ITEM'; index: number, direction: 'up' | 'down' }
  | { type: 'UPDATE_ITEM'; index: number, updates: Partial<Product>, quotationUnits: { len: string, wid: string } }
  | { type: 'SET_ITEMS'; items: Partial<Product>[] }
  | { type: 'UPDATE_ALL_UNITS'; unitType: 'len' | 'wid', newUnit: string };

export function quotationReducer(state: Partial<Product>[], action: QuotationAction): Partial<Product>[] {
  switch (action.type) {
    case 'ADD_ITEM':
      return [...state, action.payload];

    case 'REMOVE_ITEM':
      return state.filter((_, i) => i !== action.index);

    case 'DUPLICATE_ITEM': {
      const newItem = { ...state[action.index] };
      const next = [...state];
      next.splice(action.index + 1, 0, newItem);
      return next;
    }

    case 'MOVE_ITEM': {
      const { index, direction } = action;
      if (direction === 'up' && index === 0) return state;
      if (direction === 'down' && index === state.length - 1) return state;
      
      const next = [...state];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    }

    case 'UPDATE_ITEM': {
      const { index, updates, quotationUnits } = action;
      const prevItem = state[index];
      
      const baseUnit = (updates.baseUnit || prevItem.baseUnit || 'RFT') as PricingUnit;
      const targetUnit = (updates.unit || prevItem.unit || baseUnit) as PricingUnit;
      
      let item = { 
        ...prevItem, 
        ...updates,
        baseUnit,
        unit: targetUnit,
        lenUnit: updates.lenUnit || prevItem.lenUnit || quotationUnits.len,
        widUnit: updates.widUnit || prevItem.widUnit || quotationUnits.wid
      };

      let calcLen = item.len || 0;
      let calcWid = item.wid || 0;
      const lenU = item.lenUnit;
      const widU = item.widUnit;

      const isPricingMetric = ['RMT', 'SQM', 'MTR', 'METER', 'SQ METER', 'SQMTR'].includes(targetUnit.toUpperCase());

      if (!isPricingMetric) {
        calcLen = convertDimension(calcLen, lenU, 'FT');
        calcWid = convertDimension(calcWid, widU, 'FT');
      } else {
        calcLen = convertDimension(calcLen, lenU, 'MTR');
        calcWid = convertDimension(calcWid, widU, 'MTR');
      }
      
      if (updates.unit || updates.name) {
        const baseRate = item.rate || 0;
        const standardWidth = item.standardWidth || 3.5;
        const standardWidthInFeet = (baseUnit === 'RMT' || baseUnit === 'SQM') 
          ? standardWidth * 3.28084 
          : standardWidth;

        const convertedRate = convertRate(baseRate, baseUnit, targetUnit, standardWidthInFeet);
        item.convertedRate = Number(convertedRate.toFixed(2));
        item.wid = Number(convertWidth(standardWidth, baseUnit, targetUnit).toFixed(2));
      }

      const currentRate = item.convertedRate || item.rate || 0;
      const pcs = item.pcs || 0;
      const { qty, total } = calculateItemTotal(targetUnit, currentRate, calcLen, calcWid, pcs);
      
      const next = [...state];
      next[index] = { ...item, qty, total };
      return next;
    }

    case 'SET_ITEMS':
      return action.items;

    case 'UPDATE_ALL_UNITS': {
      const { unitType, newUnit } = action;
      return state.map(item => {
        if (unitType === 'len') {
          const updatedLen = convertDimension(item.len || 0, item.lenUnit || 'RFT', newUnit);
          return { ...item, len: Number(updatedLen.toFixed(3)), lenUnit: newUnit };
        } else {
          const updatedWid = convertDimension(item.wid || 0, item.widUnit || 'RFT', newUnit);
          return { ...item, wid: Number(updatedWid.toFixed(3)), widUnit: newUnit };
        }
      });
    }

    default:
      return state;
  }
}
