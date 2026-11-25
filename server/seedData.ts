import type { ActivityItem, InventoryCategory, Product, ProductUnit } from '../shared/types.ts';

export const CATEGORY_IMAGES: Record<InventoryCategory, string> = {
  'Rice and Grains': '/src/assets/images/cat_rice_grains_1795627652510.jpg',
  'Flour and Baking Products': '/src/assets/images/cat_rice_grains_1795627652510.jpg',
  'Pulses and Lentils': '/src/assets/images/cat_pulses_spices_1795627653354.jpg',
  'Oils and Ghee': '/src/assets/images/cat_oils_dairy_1795627652861.jpg',
  'Spices and Masalas': '/src/assets/images/cat_pulses_spices_1795627653354.jpg',
  'Salt and Sweeteners': '/src/assets/images/cat_pulses_spices_1795627653354.jpg',
  'Dairy Products': '/src/assets/images/cat_oils_dairy_1795627652861.jpg',
  'Snacks and Packaged Foods': '/src/assets/images/cat_snacks_beverages_1795627653873.jpg',
  'Beverages': '/src/assets/images/cat_snacks_beverages_1795627653873.jpg',
  'Personal Care Products': '/src/assets/images/cat_personal_household_1795627653819.jpg',
  'Household Cleaning Products': '/src/assets/images/cat_personal_household_1795627653819.jpg',
  'Vegetables': '/src/assets/images/cat_fresh_produce_1795627654127.jpg',
  'Fruits': '/src/assets/images/cat_fresh_produce_1795627654127.jpg',
};

interface SeedSpec {
  sku: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: ProductUnit;
  purchasePrice: number;
  sellingPrice: number;
  reorderLevel: number;
  maxStockLevel: number;
  leadTimeDays: number;
  supplier: string;
  seasonalityTag: string;
  baseMonthly: number;
  seasonPattern: number[]; // 12 multipliers
}

const FESTIVE_PEAK = [0.95, 0.92, 1.05, 0.98, 0.94, 0.96, 1.02, 1.08, 1.18, 1.42, 1.38, 1.12];
const STEADY_STAPLE = [1.0, 0.98, 1.02, 1.0, 0.97, 1.03, 1.05, 1.04, 1.06, 1.14, 1.12, 1.05];
const SUMMER_PEAK = [0.78, 0.85, 1.12, 1.34, 1.48, 1.42, 1.18, 1.02, 0.95, 0.92, 0.82, 0.76];
const MONSOON_WINTER = [1.18, 1.08, 0.95, 0.88, 0.85, 1.04, 1.24, 1.28, 1.15, 1.12, 1.18, 1.25];
const FRESH_HARVEST = [1.05, 1.02, 1.08, 1.12, 1.18, 1.06, 0.95, 0.94, 1.02, 1.15, 1.18, 1.1];

const SPECS: SeedSpec[] = [
  // 1. Rice and Grains
  { sku: 'GRN-101', name: 'Basmati Rice (Aged Royal)', category: 'Rice and Grains', quantity: 28, unit: 'kg', purchasePrice: 112, sellingPrice: 145, reorderLevel: 60, maxStockLevel: 260, leadTimeDays: 5, supplier: 'Karnal Agro Mills', seasonalityTag: 'Festive & Wedding Peak', baseMonthly: 185, seasonPattern: FESTIVE_PEAK },
  { sku: 'GRN-102', name: 'Gobindobhog Rice', category: 'Rice and Grains', quantity: 14, unit: 'kg', purchasePrice: 98, sellingPrice: 132, reorderLevel: 35, maxStockLevel: 140, leadTimeDays: 6, supplier: 'Burdwan Heritage Grains', seasonalityTag: 'Puja & Festive Surge', baseMonthly: 82, seasonPattern: FESTIVE_PEAK },
  { sku: 'GRN-103', name: 'Sona Masoori Rice', category: 'Rice and Grains', quantity: 165, unit: 'kg', purchasePrice: 54, sellingPrice: 72, reorderLevel: 70, maxStockLevel: 300, leadTimeDays: 4, supplier: 'Deccan Paddy Co.', seasonalityTag: 'Year-Round Staple', baseMonthly: 220, seasonPattern: STEADY_STAPLE },
  { sku: 'GRN-104', name: 'Miniket Rice', category: 'Rice and Grains', quantity: 140, unit: 'kg', purchasePrice: 52, sellingPrice: 68, reorderLevel: 65, maxStockLevel: 250, leadTimeDays: 4, supplier: 'Bengal Rice Traders', seasonalityTag: 'Year-Round Staple', baseMonthly: 190, seasonPattern: STEADY_STAPLE },
  { sku: 'GRN-105', name: 'Flattened Rice (Poha)', category: 'Rice and Grains', quantity: 26, unit: 'kg', purchasePrice: 46, sellingPrice: 64, reorderLevel: 30, maxStockLevel: 120, leadTimeDays: 3, supplier: 'Indore Grain House', seasonalityTag: 'Breakfast & Monsoon', baseMonthly: 95, seasonPattern: MONSOON_WINTER },
  { sku: 'GRN-106', name: 'Puffed Rice (Murmura)', category: 'Rice and Grains', quantity: 42, unit: 'pkt', purchasePrice: 28, sellingPrice: 42, reorderLevel: 25, maxStockLevel: 100, leadTimeDays: 3, supplier: 'Bengal Rice Traders', seasonalityTag: 'Evening Snack Demand', baseMonthly: 74, seasonPattern: MONSOON_WINTER },
  { sku: 'GRN-107', name: 'Ragi (Finger Millet)', category: 'Rice and Grains', quantity: 58, unit: 'kg', purchasePrice: 56, sellingPrice: 78, reorderLevel: 22, maxStockLevel: 95, leadTimeDays: 5, supplier: 'Mysuru Millet Farm', seasonalityTag: 'Health & Winter', baseMonthly: 48, seasonPattern: MONSOON_WINTER },

  // 2. Flour and Baking Products
  { sku: 'FLR-201', name: 'Wheat Flour (Chakki Atta)', category: 'Flour and Baking Products', quantity: 42, unit: 'kg', purchasePrice: 38, sellingPrice: 52, reorderLevel: 95, maxStockLevel: 400, leadTimeDays: 3, supplier: 'MP Sharbati Mills', seasonalityTag: 'Daily Staple', baseMonthly: 320, seasonPattern: STEADY_STAPLE },
  { sku: 'FLR-202', name: 'Refined Flour (Maida)', category: 'Flour and Baking Products', quantity: 78, unit: 'kg', purchasePrice: 34, sellingPrice: 48, reorderLevel: 40, maxStockLevel: 160, leadTimeDays: 3, supplier: 'MP Sharbati Mills', seasonalityTag: 'Festive Baking', baseMonthly: 110, seasonPattern: FESTIVE_PEAK },
  { sku: 'FLR-203', name: 'Gram Flour (Besan)', category: 'Flour and Baking Products', quantity: 19, unit: 'kg', purchasePrice: 76, sellingPrice: 102, reorderLevel: 35, maxStockLevel: 150, leadTimeDays: 4, supplier: 'Bikaner Pulse Mill', seasonalityTag: 'Monsoon & Diwali', baseMonthly: 92, seasonPattern: FESTIVE_PEAK },
  { sku: 'FLR-204', name: 'Semolina (Suji / Rava)', category: 'Flour and Baking Products', quantity: 64, unit: 'kg', purchasePrice: 42, sellingPrice: 58, reorderLevel: 30, maxStockLevel: 130, leadTimeDays: 3, supplier: 'MP Sharbati Mills', seasonalityTag: 'Steady Household', baseMonthly: 86, seasonPattern: STEADY_STAPLE },
  { sku: 'FLR-205', name: 'Baking Powder & Soda Pack', category: 'Flour and Baking Products', quantity: 46, unit: 'box', purchasePrice: 32, sellingPrice: 48, reorderLevel: 20, maxStockLevel: 85, leadTimeDays: 4, supplier: 'Metro Bakers Supply', seasonalityTag: 'Holiday Peak', baseMonthly: 38, seasonPattern: FESTIVE_PEAK },

  // 3. Pulses and Lentils
  { sku: 'PLS-301', name: 'Toor Dal (Arhar)', category: 'Pulses and Lentils', quantity: 22, unit: 'kg', purchasePrice: 128, sellingPrice: 162, reorderLevel: 55, maxStockLevel: 220, leadTimeDays: 4, supplier: 'Latur Dal Co-op', seasonalityTag: 'Daily Protein Staple', baseMonthly: 165, seasonPattern: STEADY_STAPLE },
  { sku: 'PLS-302', name: 'Moong Dal (Yellow Split)', category: 'Pulses and Lentils', quantity: 72, unit: 'kg', purchasePrice: 108, sellingPrice: 138, reorderLevel: 40, maxStockLevel: 160, leadTimeDays: 4, supplier: 'Bikaner Pulse Mill', seasonalityTag: 'Year-Round', baseMonthly: 118, seasonPattern: STEADY_STAPLE },
  { sku: 'PLS-303', name: 'Masoor Dal (Red Lentil)', category: 'Pulses and Lentils', quantity: 84, unit: 'kg', purchasePrice: 88, sellingPrice: 116, reorderLevel: 38, maxStockLevel: 150, leadTimeDays: 4, supplier: 'Latur Dal Co-op', seasonalityTag: 'Year-Round', baseMonthly: 105, seasonPattern: STEADY_STAPLE },
  { sku: 'PLS-304', name: 'Chana Dal', category: 'Pulses and Lentils', quantity: 48, unit: 'kg', purchasePrice: 78, sellingPrice: 104, reorderLevel: 32, maxStockLevel: 130, leadTimeDays: 4, supplier: 'Indore Grain House', seasonalityTag: 'Festive Sweets', baseMonthly: 84, seasonPattern: FESTIVE_PEAK },
  { sku: 'PLS-305', name: 'Kabuli Chana (Chickpeas)', category: 'Pulses and Lentils', quantity: 15, unit: 'kg', purchasePrice: 118, sellingPrice: 150, reorderLevel: 28, maxStockLevel: 110, leadTimeDays: 5, supplier: 'Indore Grain House', seasonalityTag: 'Festive & Weekend', baseMonthly: 68, seasonPattern: FESTIVE_PEAK },
  { sku: 'PLS-306', name: 'Rajma (Red Kidney Beans)', category: 'Pulses and Lentils', quantity: 52, unit: 'kg', purchasePrice: 124, sellingPrice: 158, reorderLevel: 25, maxStockLevel: 105, leadTimeDays: 5, supplier: 'Jammu Agro Harvest', seasonalityTag: 'Winter Comfort Peak', baseMonthly: 64, seasonPattern: MONSOON_WINTER },
  { sku: 'PLS-307', name: 'Soya Chunks', category: 'Pulses and Lentils', quantity: 96, unit: 'pkt', purchasePrice: 44, sellingPrice: 60, reorderLevel: 25, maxStockLevel: 85, leadTimeDays: 3, supplier: 'Indore Grain House', seasonalityTag: 'Overstocked Item', baseMonthly: 32, seasonPattern: STEADY_STAPLE },

  // 4. Oils and Ghee
  { sku: 'OIL-401', name: 'Cold-Pressed Mustard Oil', category: 'Oils and Ghee', quantity: 18, unit: 'L', purchasePrice: 156, sellingPrice: 195, reorderLevel: 45, maxStockLevel: 180, leadTimeDays: 5, supplier: 'Alwar Ghani Oils', seasonalityTag: 'Winter & Festive', baseMonthly: 128, seasonPattern: MONSOON_WINTER },
  { sku: 'OIL-402', name: 'Refined Sunflower Oil', category: 'Oils and Ghee', quantity: 92, unit: 'L', purchasePrice: 122, sellingPrice: 152, reorderLevel: 50, maxStockLevel: 210, leadTimeDays: 4, supplier: 'Saurashtra Refineries', seasonalityTag: 'Daily Cooking', baseMonthly: 156, seasonPattern: STEADY_STAPLE },
  { sku: 'OIL-403', name: 'Groundnut Oil', category: 'Oils and Ghee', quantity: 41, unit: 'L', purchasePrice: 168, sellingPrice: 205, reorderLevel: 28, maxStockLevel: 115, leadTimeDays: 5, supplier: 'Saurashtra Refineries', seasonalityTag: 'Festive Frying', baseMonthly: 62, seasonPattern: FESTIVE_PEAK },
  { sku: 'OIL-404', name: 'Pure Cow Ghee', category: 'Oils and Ghee', quantity: 11, unit: 'jar', purchasePrice: 540, sellingPrice: 660, reorderLevel: 26, maxStockLevel: 100, leadTimeDays: 5, supplier: 'Anand Dairy Federation', seasonalityTag: 'High Festive Surge', baseMonthly: 74, seasonPattern: FESTIVE_PEAK },
  { sku: 'OIL-405', name: 'Virgin Coconut Oil', category: 'Oils and Ghee', quantity: 36, unit: 'bottle', purchasePrice: 210, sellingPrice: 265, reorderLevel: 18, maxStockLevel: 80, leadTimeDays: 6, supplier: 'Kochi Naturals', seasonalityTag: 'Steady Wellness', baseMonthly: 36, seasonPattern: STEADY_STAPLE },

  // 5. Spices and Masalas
  { sku: 'SPC-501', name: 'Salem Turmeric Powder', category: 'Spices and Masalas', quantity: 54, unit: 'pkt', purchasePrice: 48, sellingPrice: 68, reorderLevel: 28, maxStockLevel: 120, leadTimeDays: 4, supplier: 'Erode Spice Guild', seasonalityTag: 'Daily Essential', baseMonthly: 88, seasonPattern: STEADY_STAPLE },
  { sku: 'SPC-502', name: 'Kashmiri Red Chilli Powder', category: 'Spices and Masalas', quantity: 16, unit: 'pkt', purchasePrice: 74, sellingPrice: 98, reorderLevel: 30, maxStockLevel: 110, leadTimeDays: 5, supplier: 'Guntur Spice House', seasonalityTag: 'Festive & Winter', baseMonthly: 76, seasonPattern: FESTIVE_PEAK },
  { sku: 'SPC-503', name: 'Garam Masala Blend', category: 'Spices and Masalas', quantity: 29, unit: 'pkt', purchasePrice: 62, sellingPrice: 88, reorderLevel: 25, maxStockLevel: 100, leadTimeDays: 4, supplier: 'Old Delhi Masale', seasonalityTag: 'Festive Cooking', baseMonthly: 69, seasonPattern: FESTIVE_PEAK },
  { sku: 'SPC-504', name: 'Biryani Masala', category: 'Spices and Masalas', quantity: 42, unit: 'box', purchasePrice: 54, sellingPrice: 76, reorderLevel: 20, maxStockLevel: 90, leadTimeDays: 4, supplier: 'Old Delhi Masale', seasonalityTag: 'Weekend & Eid/Diwali', baseMonthly: 55, seasonPattern: FESTIVE_PEAK },
  { sku: 'SPC-505', name: 'Green Cardamom (Elaichi)', category: 'Spices and Masalas', quantity: 6, unit: 'pkt', purchasePrice: 245, sellingPrice: 315, reorderLevel: 16, maxStockLevel: 65, leadTimeDays: 6, supplier: 'Idukki Planters Co-op', seasonalityTag: 'Festive Sweets & Chai', baseMonthly: 42, seasonPattern: FESTIVE_PEAK },
  { sku: 'SPC-506', name: 'Cumin Seeds (Jeera)', category: 'Spices and Masalas', quantity: 47, unit: 'pkt', purchasePrice: 82, sellingPrice: 110, reorderLevel: 24, maxStockLevel: 95, leadTimeDays: 4, supplier: 'Unjha Spice Market', seasonalityTag: 'Daily Tempering', baseMonthly: 71, seasonPattern: STEADY_STAPLE },

  // 6. Salt and Sweeteners
  { sku: 'SWT-601', name: 'Iodised Vacuum Salt', category: 'Salt and Sweeteners', quantity: 135, unit: 'kg', purchasePrice: 18, sellingPrice: 28, reorderLevel: 60, maxStockLevel: 260, leadTimeDays: 2, supplier: 'Mithapur Salt Works', seasonalityTag: 'Ultra-Steady Staple', baseMonthly: 210, seasonPattern: STEADY_STAPLE },
  { sku: 'SWT-602', name: 'Sendha Namak (Rock Salt)', category: 'Salt and Sweeteners', quantity: 38, unit: 'pkt', purchasePrice: 32, sellingPrice: 46, reorderLevel: 22, maxStockLevel: 90, leadTimeDays: 4, supplier: 'Himalayan Mineral Co.', seasonalityTag: 'Fasting & Navratri Peak', baseMonthly: 54, seasonPattern: FESTIVE_PEAK },
  { sku: 'SWT-603', name: 'Refined Cane Sugar', category: 'Salt and Sweeteners', quantity: 58, unit: 'kg', purchasePrice: 40, sellingPrice: 50, reorderLevel: 70, maxStockLevel: 280, leadTimeDays: 3, supplier: 'Kolhapur Sugar Mills', seasonalityTag: 'Festive Mithai Peak', baseMonthly: 205, seasonPattern: FESTIVE_PEAK },
  { sku: 'SWT-604', name: 'Organic Kolhapur Jaggery', category: 'Salt and Sweeteners', quantity: 18, unit: 'kg', purchasePrice: 64, sellingPrice: 88, reorderLevel: 30, maxStockLevel: 120, leadTimeDays: 5, supplier: 'Kolhapur Sugar Mills', seasonalityTag: 'Winter & Makar Sankranti', baseMonthly: 78, seasonPattern: MONSOON_WINTER },
  { sku: 'SWT-605', name: 'Wildflower Raw Honey', category: 'Salt and Sweeteners', quantity: 34, unit: 'jar', purchasePrice: 195, sellingPrice: 265, reorderLevel: 16, maxStockLevel: 70, leadTimeDays: 5, supplier: 'Sundarban Apiary', seasonalityTag: 'Winter Immunity Peak', baseMonthly: 39, seasonPattern: MONSOON_WINTER },

  // 7. Dairy Products
  { sku: 'DRY-701', name: 'Fresh Full Cream Milk', category: 'Dairy Products', quantity: 24, unit: 'L', purchasePrice: 54, sellingPrice: 66, reorderLevel: 45, maxStockLevel: 120, leadTimeDays: 1, supplier: 'Anand Dairy Federation', seasonalityTag: 'Daily Morning Rush', baseMonthly: 420, seasonPattern: STEADY_STAPLE },
  { sku: 'DRY-702', name: 'Farm Fresh Curd (Dahi)', category: 'Dairy Products', quantity: 32, unit: 'pkt', purchasePrice: 34, sellingPrice: 45, reorderLevel: 30, maxStockLevel: 95, leadTimeDays: 1, supplier: 'Anand Dairy Federation', seasonalityTag: 'Summer Cooling Peak', baseMonthly: 230, seasonPattern: SUMMER_PEAK },
  { sku: 'DRY-703', name: 'Malai Paneer (Fresh)', category: 'Dairy Products', quantity: 9, unit: 'pkt', purchasePrice: 78, sellingPrice: 105, reorderLevel: 26, maxStockLevel: 85, leadTimeDays: 1, supplier: 'Anand Dairy Federation', seasonalityTag: 'Weekend & Festive', baseMonthly: 168, seasonPattern: FESTIVE_PEAK },
  { sku: 'DRY-704', name: 'Pasteurised Table Butter', category: 'Dairy Products', quantity: 48, unit: 'box', purchasePrice: 48, sellingPrice: 60, reorderLevel: 24, maxStockLevel: 110, leadTimeDays: 2, supplier: 'Anand Dairy Federation', seasonalityTag: 'Steady Breakfast', baseMonthly: 132, seasonPattern: STEADY_STAPLE },
  { sku: 'DRY-705', name: 'Spiced Buttermilk (Chaas)', category: 'Dairy Products', quantity: 28, unit: 'bottle', purchasePrice: 16, sellingPrice: 25, reorderLevel: 35, maxStockLevel: 140, leadTimeDays: 2, supplier: 'Anand Dairy Federation', seasonalityTag: 'Strong Summer Peak', baseMonthly: 175, seasonPattern: SUMMER_PEAK },

  // 8. Snacks and Packaged Foods
  { sku: 'SNK-801', name: 'Bikaneri Bhujia Sev', category: 'Snacks and Packaged Foods', quantity: 62, unit: 'pkt', purchasePrice: 42, sellingPrice: 58, reorderLevel: 35, maxStockLevel: 160, leadTimeDays: 3, supplier: 'Bikaner Namkeen Co.', seasonalityTag: 'Monsoon & Festive', baseMonthly: 145, seasonPattern: FESTIVE_PEAK },
  { sku: 'SNK-802', name: 'Masala Potato Chips', category: 'Snacks and Packaged Foods', quantity: 88, unit: 'pkt', purchasePrice: 15, sellingPrice: 20, reorderLevel: 45, maxStockLevel: 220, leadTimeDays: 3, supplier: 'Pune Crisp Foods', seasonalityTag: 'High Impulse Turnover', baseMonthly: 260, seasonPattern: SUMMER_PEAK },
  { sku: 'SNK-803', name: 'Marie & Butter Biscuits', category: 'Snacks and Packaged Foods', quantity: 112, unit: 'pkt', purchasePrice: 22, sellingPrice: 30, reorderLevel: 50, maxStockLevel: 240, leadTimeDays: 3, supplier: 'Britannia Regional Dist.', seasonalityTag: 'Chai Time Staple', baseMonthly: 295, seasonPattern: MONSOON_WINTER },
  { sku: 'SNK-804', name: 'Instant Masala Noodles', category: 'Snacks and Packaged Foods', quantity: 31, unit: 'pkt', purchasePrice: 11, sellingPrice: 15, reorderLevel: 70, maxStockLevel: 320, leadTimeDays: 3, supplier: 'Metro FMCG Hub', seasonalityTag: 'Monsoon & Student Rush', baseMonthly: 310, seasonPattern: MONSOON_WINTER },
  { sku: 'SNK-805', name: 'Roasted Salted Peanuts', category: 'Snacks and Packaged Foods', quantity: 44, unit: 'pkt', purchasePrice: 36, sellingPrice: 50, reorderLevel: 25, maxStockLevel: 110, leadTimeDays: 4, supplier: 'Saurashtra Snack Co.', seasonalityTag: 'Winter Evening Snack', baseMonthly: 84, seasonPattern: MONSOON_WINTER },

  // 9. Beverages
  { sku: 'BEV-901', name: 'Assam CTC Leaf Tea', category: 'Beverages', quantity: 21, unit: 'pkt', purchasePrice: 128, sellingPrice: 165, reorderLevel: 40, maxStockLevel: 170, leadTimeDays: 4, supplier: 'Jorhat Tea Estates', seasonalityTag: 'Monsoon & Winter Peak', baseMonthly: 154, seasonPattern: MONSOON_WINTER },
  { sku: 'BEV-902', name: 'Darjeeling Green Tea', category: 'Beverages', quantity: 39, unit: 'box', purchasePrice: 148, sellingPrice: 195, reorderLevel: 20, maxStockLevel: 90, leadTimeDays: 5, supplier: 'Jorhat Tea Estates', seasonalityTag: 'Wellness Steady', baseMonthly: 52, seasonPattern: STEADY_STAPLE },
  { sku: 'BEV-903', name: 'Chikmagalur Filter Coffee', category: 'Beverages', quantity: 14, unit: 'pkt', purchasePrice: 165, sellingPrice: 215, reorderLevel: 24, maxStockLevel: 95, leadTimeDays: 5, supplier: 'Malnad Coffee Roasters', seasonalityTag: 'Winter & Morning Ritual', baseMonthly: 66, seasonPattern: MONSOON_WINTER },
  { sku: 'BEV-904', name: 'Tender Coconut Water', category: 'Beverages', quantity: 29, unit: 'bottle', purchasePrice: 38, sellingPrice: 55, reorderLevel: 45, maxStockLevel: 190, leadTimeDays: 3, supplier: 'Pollachi Coco Drinks', seasonalityTag: 'Summer Hydration Spike', baseMonthly: 180, seasonPattern: SUMMER_PEAK },
  { sku: 'BEV-905', name: 'Mixed Fruit Juice (1L)', category: 'Beverages', quantity: 68, unit: 'bottle', purchasePrice: 84, sellingPrice: 115, reorderLevel: 35, maxStockLevel: 150, leadTimeDays: 4, supplier: 'Metro FMCG Hub', seasonalityTag: 'Summer & Guests', baseMonthly: 118, seasonPattern: SUMMER_PEAK },

  // 10. Personal Care Products
  { sku: 'PRC-1001', name: 'Neem & Tulsi Bathing Soap', category: 'Personal Care Products', quantity: 126, unit: 'pcs', purchasePrice: 28, sellingPrice: 40, reorderLevel: 55, maxStockLevel: 240, leadTimeDays: 4, supplier: 'AyurCare Formulations', seasonalityTag: 'Summer Hygiene Peak', baseMonthly: 195, seasonPattern: SUMMER_PEAK },
  { sku: 'PRC-1002', name: 'Herbal Amla Hair Oil', category: 'Personal Care Products', quantity: 37, unit: 'bottle', purchasePrice: 92, sellingPrice: 128, reorderLevel: 25, maxStockLevel: 110, leadTimeDays: 5, supplier: 'AyurCare Formulations', seasonalityTag: 'Steady Care', baseMonthly: 74, seasonPattern: STEADY_STAPLE },
  { sku: 'PRC-1003', name: 'Clove & Mint Toothpaste', category: 'Personal Care Products', quantity: 82, unit: 'pcs', purchasePrice: 68, sellingPrice: 95, reorderLevel: 40, maxStockLevel: 180, leadTimeDays: 4, supplier: 'Metro FMCG Hub', seasonalityTag: 'Daily Essential', baseMonthly: 138, seasonPattern: STEADY_STAPLE },
  { sku: 'PRC-1004', name: 'Gentle Botanical Handwash', category: 'Personal Care Products', quantity: 17, unit: 'bottle', purchasePrice: 78, sellingPrice: 108, reorderLevel: 28, maxStockLevel: 115, leadTimeDays: 4, supplier: 'AyurCare Formulations', seasonalityTag: 'Monsoon Hygiene', baseMonthly: 86, seasonPattern: MONSOON_WINTER },

  // 11. Household Cleaning Products
  { sku: 'HCL-1101', name: 'Enzyme Detergent Powder', category: 'Household Cleaning Products', quantity: 56, unit: 'kg', purchasePrice: 88, sellingPrice: 120, reorderLevel: 40, maxStockLevel: 180, leadTimeDays: 4, supplier: 'CleanHome Logistics', seasonalityTag: 'Monsoon Laundry Peak', baseMonthly: 135, seasonPattern: MONSOON_WINTER },
  { sku: 'HCL-1102', name: 'Lemon Dishwash Liquid', category: 'Household Cleaning Products', quantity: 24, unit: 'bottle', purchasePrice: 82, sellingPrice: 112, reorderLevel: 32, maxStockLevel: 140, leadTimeDays: 4, supplier: 'CleanHome Logistics', seasonalityTag: 'Daily Kitchen', baseMonthly: 104, seasonPattern: STEADY_STAPLE },
  { sku: 'HCL-1103', name: 'Pine Floor Cleaner', category: 'Household Cleaning Products', quantity: 49, unit: 'bottle', purchasePrice: 96, sellingPrice: 135, reorderLevel: 28, maxStockLevel: 125, leadTimeDays: 4, supplier: 'CleanHome Logistics', seasonalityTag: 'Diwali Deep-Clean Peak', baseMonthly: 88, seasonPattern: FESTIVE_PEAK },
  { sku: 'HCL-1104', name: 'Bio-Degradable Garbage Bags', category: 'Household Cleaning Products', quantity: 145, unit: 'pkt', purchasePrice: 44, sellingPrice: 65, reorderLevel: 30, maxStockLevel: 100, leadTimeDays: 3, supplier: 'EcoPack India', seasonalityTag: 'Overstocked Item', baseMonthly: 42, seasonPattern: STEADY_STAPLE },

  // 12. Vegetables
  { sku: 'VEG-1201', name: 'Agra Red Potato', category: 'Vegetables', quantity: 68, unit: 'kg', purchasePrice: 24, sellingPrice: 34, reorderLevel: 85, maxStockLevel: 300, leadTimeDays: 2, supplier: 'Azadpur Mandi Direct', seasonalityTag: 'Daily Kitchen Staple', baseMonthly: 340, seasonPattern: STEADY_STAPLE },
  { sku: 'VEG-1202', name: 'Nashik Red Onion', category: 'Vegetables', quantity: 24, unit: 'kg', purchasePrice: 32, sellingPrice: 46, reorderLevel: 80, maxStockLevel: 280, leadTimeDays: 2, supplier: 'Lasalgaon Farmers FPO', seasonalityTag: 'High Price Volatility', baseMonthly: 315, seasonPattern: FRESH_HARVEST },
  { sku: 'VEG-1203', name: 'Hybrid Vine Tomato', category: 'Vegetables', quantity: 14, unit: 'kg', purchasePrice: 28, sellingPrice: 42, reorderLevel: 65, maxStockLevel: 210, leadTimeDays: 1, supplier: 'Azadpur Mandi Direct', seasonalityTag: 'Monsoon Supply Risk', baseMonthly: 270, seasonPattern: FRESH_HARVEST },
  { sku: 'VEG-1204', name: 'Fresh Ginger & Garlic Pack', category: 'Vegetables', quantity: 36, unit: 'kg', purchasePrice: 110, sellingPrice: 148, reorderLevel: 25, maxStockLevel: 95, leadTimeDays: 2, supplier: 'Azadpur Mandi Direct', seasonalityTag: 'Winter & Chai Peak', baseMonthly: 88, seasonPattern: MONSOON_WINTER },
  { sku: 'VEG-1205', name: 'Coriander & Spinach Bundle', category: 'Vegetables', quantity: 22, unit: 'bunch', purchasePrice: 12, sellingPrice: 20, reorderLevel: 35, maxStockLevel: 90, leadTimeDays: 1, supplier: 'Local Peri-Urban Farm', seasonalityTag: 'Perishable Daily Greens', baseMonthly: 240, seasonPattern: MONSOON_WINTER },

  // 13. Fruits
  { sku: 'FRT-1301', name: 'Himachal Red Apple', category: 'Fruits', quantity: 42, unit: 'kg', purchasePrice: 135, sellingPrice: 178, reorderLevel: 35, maxStockLevel: 140, leadTimeDays: 3, supplier: 'Shimla Orchard Co-op', seasonalityTag: 'Autumn Harvest & Festive', baseMonthly: 118, seasonPattern: FESTIVE_PEAK },
  { sku: 'FRT-1302', name: 'Yelakki Banana', category: 'Fruits', quantity: 18, unit: 'dozen', purchasePrice: 48, sellingPrice: 68, reorderLevel: 40, maxStockLevel: 120, leadTimeDays: 1, supplier: 'Local Peri-Urban Farm', seasonalityTag: 'Puja & Daily Fruit', baseMonthly: 220, seasonPattern: FESTIVE_PEAK },
  { sku: 'FRT-1303', name: 'Bhagwa Pomegranate', category: 'Fruits', quantity: 34, unit: 'kg', purchasePrice: 128, sellingPrice: 170, reorderLevel: 28, maxStockLevel: 110, leadTimeDays: 3, supplier: 'Solapur Fruit Growers', seasonalityTag: 'Festive & Wellness', baseMonthly: 92, seasonPattern: FESTIVE_PEAK },
  { sku: 'FRT-1304', name: 'Ratnagiri Alphonso Mango', category: 'Fruits', quantity: 12, unit: 'dozen', purchasePrice: 420, sellingPrice: 560, reorderLevel: 25, maxStockLevel: 95, leadTimeDays: 3, supplier: 'Konkan Mango Collective', seasonalityTag: 'Peak Summer Demand', baseMonthly: 84, seasonPattern: SUMMER_PEAK },
  { sku: 'FRT-1305', name: 'Kagzi Lemon', category: 'Fruits', quantity: 46, unit: 'kg', purchasePrice: 68, sellingPrice: 95, reorderLevel: 25, maxStockLevel: 100, leadTimeDays: 2, supplier: 'Solapur Fruit Growers', seasonalityTag: 'Summer Nimbu Pani Spike', baseMonthly: 96, seasonPattern: SUMMER_PEAK },
];

function deterministicWave(index: number, seedOffset: number): number {
  const angle = (index + 1) * 1.37 + seedOffset * 0.71;
  return 0.94 + 0.12 * ((Math.sin(angle) + 1) / 2);
}

export function createSeedProducts(): Product[] {
  const nowIso = new Date().toISOString();

  return SPECS.map((spec, idx) => {
    const monthlySales = spec.seasonPattern.map((mult, mIdx) => {
      // Slight gentle organic growth over the 12 months
      const growth = 0.94 + (mIdx / 11) * 0.11;
      const noise = deterministicWave(mIdx, idx);
      return Math.max(5, Math.round(spec.baseMonthly * mult * growth * noise));
    });

    const monthlyRestocks = monthlySales.map((sold, mIdx) => {
      // Restocks track sales in batches, with occasional buffer
      const batchFactor = mIdx === 11 ? 0.92 : 1.0 + ((idx + mIdx) % 3 === 0 ? 0.08 : -0.04);
      return Math.max(5, Math.round(sold * batchFactor));
    });

    return {
      id: `prod-${idx + 1}`,
      sku: spec.sku,
      name: spec.name,
      category: spec.category,
      quantity: spec.quantity,
      unit: spec.unit,
      purchasePrice: spec.purchasePrice,
      sellingPrice: spec.sellingPrice,
      reorderLevel: spec.reorderLevel,
      maxStockLevel: spec.maxStockLevel,
      leadTimeDays: spec.leadTimeDays,
      supplier: spec.supplier,
      seasonalityTag: spec.seasonalityTag,
      imageUrl: CATEGORY_IMAGES[spec.category],
      monthlySales,
      monthlyRestocks,
      updatedAt: nowIso,
    };
  });
}

export function createSeedActivities(): ActivityItem[] {
  const now = Date.now();
  const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: 'act-1',
      type: 'sale',
      productId: 'prod-1',
      productName: 'Basmati Rice (Aged Royal)',
      sku: 'GRN-101',
      quantityDelta: -18,
      unit: 'kg',
      note: 'Morning B2B hotel order fulfilled',
      timestamp: minsAgo(24),
    },
    {
      id: 'act-2',
      type: 'restock',
      productId: 'prod-3',
      productName: 'Sona Masoori Rice',
      sku: 'GRN-103',
      quantityDelta: 75,
      unit: 'kg',
      note: 'PO-4812 received from Deccan Paddy Co.',
      timestamp: minsAgo(85),
    },
    {
      id: 'act-3',
      type: 'sale',
      productId: 'prod-23',
      productName: 'Pure Cow Ghee',
      sku: 'OIL-404',
      quantityDelta: -9,
      unit: 'jar',
      note: 'Festive hamper counter dispatch',
      timestamp: minsAgo(140),
    },
    {
      id: 'act-4',
      type: 'restock',
      productId: 'prod-39',
      productName: 'Bikaneri Bhujia Sev',
      sku: 'SNK-801',
      quantityDelta: 40,
      unit: 'pkt',
      note: 'Weekly distributor replenishment',
      timestamp: minsAgo(260),
    },
    {
      id: 'act-5',
      type: 'sale',
      productId: 'prod-57',
      productName: 'Hybrid Vine Tomato',
      sku: 'VEG-1203',
      quantityDelta: -22,
      unit: 'kg',
      note: 'Retail POS morning batch checkout',
      timestamp: minsAgo(340),
    },
  ];
}
