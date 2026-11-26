import { describe, expect, it } from 'vitest';
import {
  escapeDisplayText,
  validateMovementInput,
  validateProductInput,
  validateScenarioInput,
} from './validation';

describe('Input Validation & AI Output Sanitization', () => {
  it('accepts valid Indian retail product input and normalizes SKU/strings', () => {
    const result = validateProductInput({
      name: '  Sona Masoori Rice  ',
      sku: 'grn-103',
      category: 'Rice and Grains',
      unit: 'kg',
      quantity: 120,
      purchasePrice: 54,
      sellingPrice: 72,
      reorderLevel: 50,
      maxStockLevel: 250,
      leadTimeDays: 4,
      supplier: 'Deccan Paddy Co.',
      seasonalityTag: 'Year-Round',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Sona Masoori Rice');
      expect(result.data.sku).toBe('GRN-103');
    }
  });

  it('rejects negative quantities, invalid categories, and selling price below purchase price', () => {
    const badQty = validateProductInput({
      name: 'Toor Dal',
      category: 'Pulses and Lentils',
      unit: 'kg',
      quantity: -5,
      purchasePrice: 110,
      sellingPrice: 140,
    });
    expect(badQty.ok).toBe(false);

    const badMargin = validateProductInput({
      name: 'Toor Dal',
      category: 'Pulses and Lentils',
      unit: 'kg',
      quantity: 20,
      purchasePrice: 150,
      sellingPrice: 120,
    });
    expect(badMargin.ok).toBe(false);

    const badCategory = validateProductInput({
      name: 'Unknown Item',
      category: 'Electronics',
      unit: 'pcs',
      quantity: 10,
      purchasePrice: 50,
      sellingPrice: 80,
    });
    expect(badCategory.ok).toBe(false);
  });

  it('prevents selling more units than currently available in stock', () => {
    const oversell = validateMovementInput({ type: 'sale', quantity: 50 }, 12);
    expect(oversell.ok).toBe(false);

    const validSale = validateMovementInput({ type: 'sale', quantity: 5, note: 'POS batch' }, 12);
    expect(validSale.ok).toBe(true);
  });

  it('clamps extreme scenario shock inputs and strips unsafe HTML tags', () => {
    const scenario = validateScenarioInput({
      scenarioName: '<script>alert(1)</script>Festival Surge',
      demandMultiplierPct: 999,
      leadTimeShockDays: -10,
      priceInflationPct: 500,
      focusCategory: 'InvalidCategory',
      customNotes: 'Stock up early <b>now</b>',
    });

    expect(scenario.scenarioName).not.toContain('<script>');
    expect(scenario.demandMultiplierPct).toBe(150);
    expect(scenario.leadTimeShockDays).toBe(0);
    expect(scenario.priceInflationPct).toBe(60);
    expect(scenario.focusCategory).toBe('All');
    expect(scenario.customNotes).toBe('Stock up early now');
  });

  it('escapes HTML tags and unsafe URI schemes in AI-generated text', () => {
    const escaped = escapeDisplayText('Order rice <img src=x onerror=alert(1)> javascript:void(0)');
    expect(escaped).not.toContain('<img');
    expect(escaped.toLowerCase()).not.toContain('javascript:');
  });
});
