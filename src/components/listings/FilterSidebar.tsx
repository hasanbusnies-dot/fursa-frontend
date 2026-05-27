'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, ChevronLeft, Search, RotateCcw, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import type { ApiResponse } from '@/types';
import { api } from '@/services/api';
import {
  FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS, BODY_TYPE_OPTIONS,
  DRIVETRAIN_OPTIONS, FROM_WHO_OPTIONS, CAR_COLORS, SYRIAN_GOVERNORATES,
} from '@/components/listings/wizard/schema';

// ── Brand lists ───────────────────────────────────────────────────────────────

const CAR_BRANDS = [
  'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW',
  'BYD', 'Chery', 'Chevrolet', 'Citroën', 'Dacia',
  'Ferrari', 'Fiat', 'Ford', 'Honda', 'Hyundai',
  'Isuzu', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini',
  'Land Rover', 'Lexus', 'Maserati', 'Mazda', 'Mercedes-Benz',
  'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Opel',
  'Peugeot', 'Porsche', 'Renault', 'Rolls-Royce', 'Seat',
  'Skoda', 'Subaru', 'Suzuki', 'Tesla', 'Toyota',
  'Volkswagen', 'Volvo', 'أخرى',
] as const;

const ELECTRIC_BRANDS = [
  'Abarth', 'Aion', 'Alpine', 'Arora', 'Audi', 'BMW', 'BYD', 'Citroen',
  'Cupra', 'Fiat', 'Honda', 'Hyundai', 'Jiayuan', 'Joyce', 'Kuba',
  'Lamborghini', 'Leapmotor', 'Luqi', 'Maserati', 'Mercedes-Benz', 'MG',
  'Micro', 'Mini', 'Motolux', 'Nieve', 'Opel', 'Ortimobil', 'Peugeot',
  'Polestar', 'Porsche', 'Rainwoll', 'Reeder', 'Regal Raptor', 'Relive',
  'Renault', 'RKS', 'Rolls-Royce', 'Seat', 'Smart', 'Tesla',
  'The London Taxi', 'TOGG', 'Toyota', 'Volkswagen', 'Volta', 'XEV',
  'Yuki', 'Zlin Motors',
] as const;

const MOTORCYCLE_BRANDS = [
  'Aprilia', 'Bajaj', 'Benelli', 'Beta', 'BMW', 'Can-Am', 'CFmoto',
  'Daelim', 'Derbi', 'Ducati', 'GasGas', 'Gilera', 'Haojue',
  'Harley-Davidson', 'Hero', 'Honda', 'Husaberg', 'Husqvarna',
  'Hyosung', 'Indian', 'Italjet', 'Jawa', 'Kanuni (برت)', 'Kawasaki', 'Keeway',
  'KTM', 'Kymco', 'Lambretta', 'Lifan', 'Malaguti', 'Mondial',
  'Moto Guzzi', 'Moto Morini', 'MV Agusta', 'Peugeot', 'Piaggio',
  'Polaris', 'QJ', 'Regal Raptor', 'Royal Enfield', 'Sherco',
  'Suzuki', 'SWM', 'SYM', 'Triumph', 'TVS', 'Vespa', 'Victory',
  'Voge', 'Yamaha', 'Zongshen', 'Zontes',
] as const;

const MINIVAN_BRANDS = [
  'Askam', 'BMC', 'Chery', 'Chevrolet', 'Chrysler', 'Citroen', 'Dacia',
  'Daewoo', 'Daihatsu', 'DFM', 'DFSK', 'Dodge', 'FAW', 'Fiat', 'Ford',
  'GAZ', 'GMC', 'HFKanuni', 'Hyundai', 'Isuzu', 'Iveco', 'Kia', 'Lancia',
  'MAN', 'Maxus', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan',
  'Opel', 'Peugeot', 'Piaggio', 'Pontiac', 'Regal Raptor', 'Renault',
  'Seat', 'Skoda', 'Suzuki', 'Tenax', 'Toyota', 'Volkswagen',
] as const;

const BUS_BRANDS = [
  'AKIA', 'BMC', 'Güleryüz', 'Irizar', 'Isuzu', 'Iveco', 'Karsan',
  'MAN', 'Mercedes-Benz', 'Mitsubishi', 'Neoplan', 'Otokar', 'Setra',
  'TCV', 'Temsa', 'Tezeller', 'Türkkar', 'Volvo',
] as const;

const TRUCK_BRANDS = [
  'Akeso', 'Anadol', 'Askam', 'Astra', 'Bedford', 'Beemobs', 'BMC',
  'Chrysler', 'Citroen', 'Dacia', 'Daewoo', 'DAF', 'Daihatsu', 'DFM',
  'DFSK', 'Dodge', 'FAW', 'Fiat', 'Folkvan', 'Ford Trucks', 'GAZ',
  'HFKanuni', 'Hino', 'Hyundai', 'Isuzu', 'Iveco', 'JAC', 'Kia', 'Kuba',
  'MAN', 'Mazda', 'Mercedes-Benz', 'Mitsubishi - Fuso',
  'Mitsubishi - Temsa', 'Musatti', 'Nissan', 'Opel', 'Otokar', 'Peugeot',
  'Piaggio', 'Rainwoll', 'Relive', 'Renault Trucks', 'Samsung', 'Sany',
  'Scania', 'Skoda', 'Skyjet', 'Suzuki', 'Tata', 'Tenax', 'Toyota',
  'Volkswagen', 'Volta', 'Volvo', 'Yuki',
] as const;

const TRACTOR_TRUCK_BRANDS = [
  'Askam', 'BMC', 'DAF', 'Fiat', 'Ford Trucks', 'Gaz', 'Iveco', 'Mack',
  'MAN', 'MAZ', 'Mercedes-Benz', 'Renault Trucks', 'Scania', 'Volvo',
] as const;

const BODYWORK_TYPES = [
  'مجموعة القلابات',
  'كابينة ثابتة (صندوق)',
] as const;

const TOW_TRUCK_TYPES = [
  'مركبة واحدة (سطحة)',
  'متعددة المركبات (ناقلة)',
] as const;

const COMMERCIAL_PLATES_TYPES = [
  'لوحة تاكسي (أجرة)',
  'خط ميكروباص وسرفيس',
  'خط حافلة (باص)',
  'لوحة سرفيس (مدارس/شركات)',
  'خط نقل بحري',
  'خط نقل بضائع',
] as const;

const RESIDENTIAL_FOR_SALE_TYPES = [
  'شقة',
  'ريزيدانس (شقق فاخرة)',
  'بيت مستقل',
  'فيلا',
  'مزرعة / بيت ريفي',
  'قصر',
  'فيلا بحرية (يالي)',
  'شقة بحرية',
  'شاليه / مصيف',
  'جمعية سكنية',
] as const;

// ── Residential-for-sale filter data ─────────────────────────────────────────

const ROOM_COUNTS = [
  'استوديو (1+0)', '1+1', '1.5+1', '2+0', '2+1', '2.5+1', '2+2',
  '3+0', '3+1', '3.5+1', '3+2', '3+3',
  '4+0', '4+1', '4.5+1', '4.5+2', '4+2', '4+3', '4+4',
  '5+1', '5.5+1', '5+2', '5+3', '5+4',
  '6+1', '6+2', '6.5+1', '6+3', '6+4',
  '7+1', '7+2', '7+3',
  '8+1', '8+2', '8+3', '8+4',
  '9+1', '9+2', '9+3', '9+4', '9+5', '9+6',
  '10+1', '10+2', '10 وما فوق',
] as const;

const BUILDING_AGES = [
  '0 (جاهز للسكن)', '0 (قيد الإنشاء)',
  '1', '2', '3', '4', '5',
  'بين 6-10', 'بين 11-15', 'بين 16-20', 'بين 21-25', 'بين 26-30', '31 وما فوق',
] as const;

const FLOOR_NUMBERS = [
  'طابق حديقة', 'طابق أرضي', 'أرضي مرتفع', 'طابق السطح / بنتهاوس',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30 وما فوق',
] as const;

const TOTAL_FLOORS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30 وما فوق',
] as const;

const HEATING_TYPES = [
  'لا يوجد', 'مدفأة عادية', 'مدفأة غاز', 'تدفئة طابقية', 'مركزي',
  'مركزي (بعداد مشترك)', 'كومبي (غاز طبيعي)', 'كومبي (كهرباء)',
  'تدفئة أرضية', 'مكيف', 'نظام تبريد وتدفئة (Fancoil)',
  'طاقة شمسية', 'مشعاع كهربائي', 'طاقة حرارية أرضية',
  'موقد (شومينيه)', 'نظام VRV', 'مضخة حرارية',
] as const;

const BATHROOM_COUNTS   = ['لا يوجد', '1', '2', '3', '4', '5', '6', '6 وما فوق'] as const;
const KITCHEN_TYPES     = ['مفتوح (أمريكي)', 'مغلق'] as const;
const PARKING_TYPES     = ['موقف مكشوف', 'موقف مغلق', 'موقف مكشوف ومغلق', 'لا يوجد'] as const;
const USAGE_STATUSES    = ['فارغ', 'مؤجر', 'يسكنه المالك'] as const;
const DEED_STATUSES     = [
  'ملكية طابقية تامة', 'ارتفاق طابقي', 'طابو حصص', 'طابو مستقل',
  'طابو أرض', 'طابو جمعية سكنية', 'حق انتفاع', 'طابو أجنبي', 'لا يوجد سجل طابو',
] as const;

const FROM_WHO_REAL_ESTATE = [
  'من المالك', 'من مكتب عقاري', 'من شركة إنشاءات', 'من بنك', 'من شركة سياحية',
] as const;

// ── Land-share filter data ────────────────────────────────────────────────────

const ZONING_STATUSES = [
  'منطقة تنظيمية (بلوك)', 'تصنيف أ (A)', 'أرض فضاء / بور', 'بساتين وحدائق',
  'مستودعات وتخزين', 'منطقة تعليمية', 'تخزين طاقة', 'سكني', 'منشأة ثقافية',
  'متنوع', 'استخدام خاص', 'منطقة صحية', 'صناعي', 'دفيئات زراعية',
  'منطقة أثرية / محمية', 'منطقة رياضية', 'أرض زراعية (حقل)',
  'أرض زراعية وبساتين مختلط', 'تجاري', 'تجاري وسكني مختلط',
  'إسكان جماعي / مجمعات', 'سياحي', 'سياحي وسكني مختلط',
  'سياحي وتجاري مختلط', 'منطقة فيلات', 'أرض زتون',
] as const;

const KAKS_VALUES = [
  '0.05', '0.10', '0.15', '0.17', '0.20', '0.24', '0.25', '0.30', '0.35', '0.40',
  '0.45', '0.50', '0.60', '0.70', '0.75', '0.80', '0.90', '0.95', '1.0', '1.05',
  '1.10', '1.15', '1.20', '1.25', '1.30', '1.35', '1.40', '1.45', '1.50', '1.55',
  '1.60', '1.75', '1.80', '1.90', '2.0', '2.07', '2.10', '2.15', '2.20', '2.30',
  '2.40', '2.50', '2.80', '3.0', '3.20', '3.30', '5.0', '10.20', '15.30', 'غير محدد',
] as const;

const GABARI_VALUES = [
  '3.50', '4.50', '6.50', '7.50', '8.50', '9.50', '10.50', '11.50', '12.50', '14.50',
  '15.50', '17.50', '18.50', '21.50', '24.50', '27.50', '30.50', '36.00',
  'حر / مفتوح', 'غير محدد',
] as const;

const LAND_DEED_STATUSES = [
  'طابو أسهم / مشاع', 'طابو مستقل / مفرز', 'سند تخصيص',
  'سند حيازة (وضع يد)', 'طابو أسهم جمعية سكنية', 'طابو أجنبي', 'لا يوجد سجل طابو',
] as const;

const FROM_WHO_LAND = [
  'من المالك', 'من مكتب عقاري', 'من شركة إنشاءات', 'من بنك',
] as const;

const PROJECT_PROPERTY_TYPES = ['شقة', 'ريزيدانس', 'فيلا'] as const;

const PROJECT_STATUS_OPTIONS = [
  'مستمر (قيد الإنشاء)', 'مكتمل (جاهز)',
] as const;

const PROJECT_ROOM_COUNTS = [
  '1+1', '1.5+1', '2+0', '2+1', '2.5+1', '2+2',
  '3+0', '3+1', '3.5+1', '3+2', '3+3',
  '4+0', '4+1', '4.5+1', '4.5+2', '4+2', '4+3', '4+4',
  '5+1', '5.5+1', '5+2', '5+3', '5+4',
  '6+1', '6+2', '6.5+1', '6+3', '6+4',
  '7+1', '7+2', '7+3', '8+1', '8+2', '8+3', '8+4',
  '9+1', '9+2', '9+3', '9+4', '9+5', '9+6',
  '10+1', '10+2', '10 وما فوق',
] as const;

const PROJECT_HEATING_TYPES = [
  'لا يوجد', 'مدفأة (صوبيا)', 'مدفأة غاز طبيعي', 'تدفئة طابقية (شوفاج)',
  'تدفئة مركزية', 'مركزية (مع عداد استهلاك)', 'كومبي (غاز طبيعي)',
  'كومبي (كهربائي)', 'تدفئة أرضية', 'مكيف هواء',
  'وحدة فانسويل (مروحة وملف)', 'طاقة شمسية', 'ردياتير كهربائي',
  'طاقة حرارية أرضية', 'موقد (شومينيه)', 'نظام VRV', 'مضخة حرارية',
] as const;

const PROJECT_DEED_STATUSES = [
  'طابو ملكية تامة (طابو أخضر)', 'طابو ارتفاق طابقي', 'طابو أسهم (مشاع)',
  'طابو مستقل (مفرز)', 'طابو أرض', 'طابو أسهم جمعية سكنية',
  'حق انتفاع', 'طابو أجنبي', 'لا يوجد سجل طابو',
] as const;

const LAND_RENT_ZONING_STATUSES = [
  'منطقة تنظيمية (بلوك)', 'أرض فضاء / بور', 'بساتين وحدائق',
  'مستودعات وتخزين', 'تخزين طاقة', 'منشأة ثقافية',
  'متنوع', 'استخدام خاص', 'صناعي', 'دفيئات زراعية',
  'منطقة رياضية', 'أرض زراعية (حقل)', 'تجاري', 'سياحي', 'أرض زتون',
] as const;

const LAND_RENT_KAKS_VALUES = [
  '0.05', '0.10', '0.15', '0.20', '0.25', '0.27', '0.30', '0.35', '0.40', '0.45',
  '0.50', '0.60', '0.70', '0.75', '0.80', '0.90', '0.95', '1.0', '1.05', '1.10',
  '1.15', '1.25', '1.30', '1.35', '1.40', '1.45', '1.50', '1.55', '1.80', '1.90',
  '2.07', '2.1', '2.20', '2.40', '3.0', '3.30', '10.20', '15.30', 'غير محدد',
] as const;

const BUILDING_FLOOR_COUNTS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9 وما فوق',
] as const;

const APARTMENTS_PER_FLOOR = ['1', '2', '3', '4', '5 وما فوق'] as const;

const BUILDING_HEATING_TYPES = [
  'لا يوجد', 'مدفأة (صوبيا)', 'تدفئة مركزية (شوفاج)', 'غاز طبيعي (مركزي)',
  'غاز طبيعي (كومبي)', 'مدفأة غاز طبيعي', 'تدفئة أرضية', 'مكيف هواء',
  'طاقة حرارية أرضية', 'طاقة شمسية', 'نظام VRV',
] as const;

const BUILDING_AGE_OPTIONS = [
  '0 (غير محدد)', '0 (جاهز للسكن)', '0 (قيد الإنشاء)',
  '1', '2', '3', '4', '5',
  'بين 6 - 10 سنوات', 'بين 11 - 15 سنة', 'بين 16 - 20 سنة',
  'بين 21 - 25 سنة', 'بين 26 - 30 سنة', '31 سنة وما فوق',
] as const;

const BUILDING_PARKING_OPTIONS = [
  'موقف مكشوف', 'موقف مغلق', 'موقف مكشوف ومغلق', 'لا يوجد',
] as const;

const BUILDING_DEED_STATUSES = [
  'طابو ملكية تامة (طابو أخضر)', 'طابو ارتفاق طابقي', 'طابو أسهم / مشاع',
  'طابو مستقل / مفرز', 'طابو أرض', 'طابو أسهم جمعية سكنية',
  'طابو أجنبي', 'لا يوجد سجل طابو',
] as const;

const FROM_WHO_BUILDING = [
  'من المالك', 'من مكتب عقاري', 'من شركة إنشاءات', 'من بنك',
] as const;

const TIMESHARE_SALE_BRANDS = [
  'منتجع بورتو طرطوس', 'منتجع الشاطئ الأزرق (شام)', 'قرية الرمال الذهبية السياحية',
  'منتجع أفاميا', 'شاليهات بلودان الكبرى', 'مجمع الزبداني السياحي',
  'منتجع جونادا', 'جولدن بيتش ريزورت', 'قرية مشتى الحلو السياحية',
  'شاليهات كسب', 'شاليهات صلنفة', 'منتجع ميرامار',
  'منتجع شاهين', 'منتجع الوادي', 'مجمع الرمال الفضية',
  'عقارات مشتركة أخرى',
] as const;

const TIMESHARE_RENT_TYPES = ['إيجار سياحي يومي'] as const;

const TIMESHARE_PERIODS: string[] = [
  ...Array.from({ length: 52 }, (_, i) => `الأسبوع ${i + 1}`),
  'جميع الفترات',
];

const TIMESHARE_ROOM_COUNTS = ['1', '2', '3', '4', '5'] as const;

const TIMESHARE_DEED_STATUSES = [
  'طابو ملكية تامة (طابو أخضر)', 'طابو ارتفاق طابقي', 'سند ملكية مشتركة / تايم شير',
  'طابو أسهم / مشاع', 'طابو مستقل / مفرز', 'طابو أرض',
  'طابو أسهم جمعية سكنية', 'طابو أجنبي', 'لا يوجد سجل طابو',
] as const;

const FROM_WHO_TIMESHARE = ['من المالك', 'من مكتب عقاري'] as const;

const TIMESHARE_CONDITIONS = ['جديد (غير مستخدم)', 'مستعمل / إعادة بيع'] as const;

const RENT_DURATIONS = [
  'أقل من 7 أيام', '7 أيام', '10 أيام', '15 يوماً', '21 يوماً', 'شهر واحد',
] as const;

const GUEST_CAPACITIES: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1));
const BED_COUNTS: string[]       = Array.from({ length: 12 }, (_, i) => String(i + 1));

const FROM_WHO_TIMESHARE_RENT = ['من المالك', 'من مكتب عقاري', 'من شركة سياحية'] as const;

const TOURIST_FACILITY_SALE_TYPES = [
  'فندق', 'شقق فندقية', 'فندق بوتيك', 'موتيل',
  'نزل / دار ضيافة', 'موقع تخييم (مخيم)', 'قرية سياحية',
] as const;

const TOURIST_FACILITY_RENT_TYPES = [
  'فندق', 'شقق فندقية', 'فندق بوتيك', 'موتيل',
  'نزل / دار ضيافة', 'موقع تخييم (مخيم)', 'قرية سياحية', 'شاطئ / بلاج',
] as const;

const POOL_RENT_TYPES = [
  'مسبح مستقل (خاص)', 'مسبح ضمن مزرعة / فيلا', 'مسبح مغلق (شتوي)',
  'مسبح عائلي مستور', 'مسبح أولمبي / تجاري',
] as const;

const POOL_RENTAL_DURATIONS = [
  'فترة صباحية', 'فترة مسائية', 'يوم كامل', 'أسبوعي',
] as const;

const POOL_CAPACITIES = [
  '1 - 5 أشخاص', '6 - 10 أشخاص', '11 - 20 شخص', '20 شخص وما فوق',
] as const;

const POOL_DEPTHS = [
  'مسبح أطفال فقط', 'متدرج / قليل العمق', 'قياسي (1.5م - 2م)', 'عميق (2م وما فوق)',
] as const;

const POOL_FACILITIES = [
  'يوجد مسبح أطفال', 'منطقة شواء (باربكيو)', 'حديقة / جلسة خارجية',
  'مطبخ', 'مسبح مدفأ', 'زحليقة مائية',
] as const;

const FROM_WHO_POOL = ['من المالك', 'من مكتب عقاري'] as const;

const RENTAL_CAR_BRANDS = [
  'Aston Martin', 'Audi', 'Bentley', 'BMW', 'BYD', 'Cadillac',
  'Chevrolet', 'Citroen', 'Dacia', 'Dodge', 'DS Automobiles',
  'Ferrari', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jaguar', 'Kia',
  'Lamborghini', 'Lexus', 'Lincoln', 'Maserati', 'Maybach', 'Mazda',
  'Mercedes-Benz', 'Mini', 'Nissan', 'Opel', 'Peugeot', 'Porsche',
  'Renault', 'Rolls-Royce', 'Seat', 'Skoda', 'Tesla', 'TOGG',
  'Toyota', 'Volkswagen', 'Volvo',
] as const;

const RENTAL_BUS_TRANSMISSIONS = ['عادي', 'أوتوماتيك'] as const;

const RENTAL_BUS_FUEL_TYPES = ['بنزين', 'بنزين + غاز (LPG)', 'مازوت / ديزل'] as const;

const RENTAL_BUS_BRANDS = [
  'Citroen', 'Fiat', 'Ford', 'Isuzu', 'MAN', 'Mercedes-Benz',
  'Mitsubishi', 'Neoplan', 'Otokar', 'Peugeot', 'Renault', 'Volkswagen',
] as const;

const RENTAL_TRUCK_BRANDS = [
  'BMC', 'DFSK', 'Fiat', 'Ford', 'Gaz', 'Hino', 'Hyundai',
  'Isuzu', 'Iveco', 'Kia', 'MAN', 'Mercedes-Benz', 'Mitsubishi',
  'Otokar', 'Renault',
] as const;

const RENTAL_RECOVERY_TYPES = [
  'سيارات إنقاذ ونقل (سطحة / ونش)',
] as const;

const RENTAL_AIRCRAFT_TYPES = [
  'طائرة مروحية (هليكوبتر)',
  'طائرة خاصة (VIP)',
] as const;

const RENTAL_AIRCRAFT_DEPOSIT_TYPES = [
  'بطاقة ائتمان',
  'نقدي',
] as const;

const RENTAL_CARAVAN_TYPES = [
  'كرفان سحب (مقطورة)',
  'عربة سكن بمحرك (موتورهوم)',
] as const;

const RENTAL_ELECTRIC_TYPES = [
  'دراجة نارية كهربائية',
  'ناقلات شخصية كهربائية / سكوتر',
] as const;

const MARINE_SALE_TYPES = [
  'يخت بمحرك (Motor Yacht)',
  'قارب شراعي',
  'طوف / قارب ببدنين (Catamaran)',
  'قارب سريع',
  'قارب مطاطي / قارب صغير',
  'جيت سكي / دباب بحري',
  'قارب بسطح مفتوح (Deck Boat)',
  'قارب تجديف / فلوكة',
  'قارب سياحي',
  'جوليت / سفينة خشبية',
  'قارب صيد',
  'سفينة ركاب',
  'سفينة شحن / ناقلة',
  'قارب خدمة',
  'غواصة',
] as const;

const DAMAGED_SUV_BRANDS = [
  'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Chery', 'Chevrolet', 'Citroen',
  'Cupra', 'Dacia', 'Daihatsu', 'Dodge', 'DS Automobiles', 'Fiat',
  'Ford', 'Foton', 'Honda', 'Hyundai', 'Infiniti', 'Isuzu', 'Jaguar',
  'Jeep', 'Kia', 'Lada', 'Land Rover', 'Maserati', 'Mazda',
  'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Opel',
  'Peugeot', 'Porsche', 'Renault', 'Seat', 'Seres', 'Skoda',
  'Skywell', 'SsangYong', 'Subaru', 'Suzuki', 'Tata', 'TOGG',
  'Toyota', 'Volkswagen', 'Volvo', 'ماركات أخرى',
] as const;

const DAMAGED_YEARS = [
  ...Array.from({ length: 43 }, (_, i) => String(2026 - i)),
] as const;

const DAMAGED_SUV_GEAR_TYPES  = ['عادي', 'أوتوماتيك'] as const;
const DAMAGED_SUV_FUEL_TYPES  = ['بنزين', 'بنزين + غاز (LPG)', 'ديزل', 'كهرباء', 'هجين + بنزين', 'هجين + ديزل', 'غاز (LPG)'] as const;
const DAMAGED_PARKING_FEE     = ['يوجد', 'لا يوجد'] as const;
const DAMAGED_SALES_STATUS    = ['جاهز للبيع', 'بانتظار الأوراق', 'عليه ديون / رهن'] as const;
const DAMAGED_DAMAGE_CAUSE    = ['حادث سير', 'عطل فني', 'حريق', 'كوارث طبيعية', 'عمل تخريبي'] as const;
const DAMAGED_SELLER_TYPES    = ['من المالك', 'من معرض'] as const;

const DAMAGED_MOTORCYCLE_BRANDS = [
  'Aprilia', 'Arora', 'Bajaj', 'Benelli', 'Bimota', 'Bisan', 'BMW',
  'CFmoto', 'Honda', 'Husqvarna', 'Hyundai', 'Jawa', 'Kanuni',
  'Kawasaki', 'KTM', 'Kuba', 'Kymco', 'Lifan', 'Mondial', 'Peugeot',
  'Piaggio', 'RKS', 'Suzuki', 'SYM', 'Triumph', 'TVS', 'Yamaha', 'Yuki',
  'ماركات أخرى',
] as const;

const DAMAGED_MOTORCYCLE_STATUS = [
  'متضرر (يحتاج صيانة)',
  'تالف (خسارة كلية)',
  'بموجب وثيقة خردة / سكراب',
] as const;

const DAMAGED_MINIVAN_BRANDS = [
  'BMC', 'Chery', 'Chrysler', 'Citroen', 'Dacia', 'Daewoo', 'Fiat',
  'Ford', 'Hyundai', 'Iveco', 'Kia', 'Mazda', 'Mercedes-Benz',
  'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Renault', 'Seat',
  'Suzuki', 'Toyota', 'Volkswagen',
] as const;

const DAMAGED_COMMERCIAL_TYPES = [
  'حافلة صغيرة ومتوسطة',
  'حافلة (باص)',
  'شاحنة وشاحنة خفيفة / بيكاب',
  'قاطرة',
  'مقطورة',
  'سيارة سطحة وناقلة / ونش',
] as const;

const DAMAGED_CAR_BRANDS = [
  'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Cadillac', 'Chery', 'Chevrolet',
  'Chrysler', 'Citroen', 'Cupra', 'Dacia', 'Daewoo', 'DS Automobiles',
  'Fiat', 'Ford', 'Geely', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar',
  'Kia', 'Lada', 'Lancia', 'Lincoln', 'Maserati', 'Mazda', 'Mercedes-Benz',
  'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Porsche',
  'Proton', 'Renault', 'Rover', 'Seat', 'Skoda', 'Smart', 'Subaru',
  'Suzuki', 'Tata', 'Tesla', 'Tofaş', 'TOGG', 'Toyota', 'Volkswagen', 'Volvo',
] as const;

const DAMAGED_EXCHANGE_OPTIONS = ['نعم', 'لا'] as const;

const MARINE_RENT_TYPES = [
  'يخت بمحرك (Motor Yacht)',
  'قارب شراعي',
  'قارب سريع',
  'قارب مطاطي / قارب صغير',
  'جيت سكي / دباب بحري',
  'قارب سياحي',
  'جوليت / سفينة خشبية',
  'قارب صيد',
  'قارب خدمة',
] as const;

const MARINE_SELLER_TYPES   = ['من المالك', 'من معرض', 'من شركة'] as const;
const MARINE_CONDITION_TYPES = ['جديد', 'مستعمل'] as const;
const MARINE_EXCHANGE_OPTIONS = ['نعم', 'لا'] as const;

const RENTAL_CARAVAN_YEARS = [
  ...Array.from({ length: 47 }, (_, i) => String(2026 - i)),
  'أخرى',
] as const;

const RENTAL_CARAVAN_DEPOSIT_TYPES = [
  'بطاقة ائتمان',
  'نقدي',
] as const;

const RENTAL_CARAVAN_INSURANCE = ['نعم', 'لا'] as const;

const RENTAL_TOW_TRUCK_BRANDS = [
  'Bedford', 'BMC', 'Chevrolet', 'Chrysler', 'Citroën', 'DAF',
  'Dodge', 'Fiat', 'Ford', 'Gazelle', 'Hino', 'Hyundai', 'Isuzu',
  'Iveco', 'Kia', 'Liebherr', 'MAN', 'Mazda', 'Mercedes-Benz',
  'Mitsubishi', 'Otokar', 'Peugeot', 'Renault', 'Scania',
  'Volkswagen', 'Volvo', 'ماركات أخرى',
] as const;

const RENTAL_TRUCK_TYPES = [
  'سيارة صيانة / ورشة',
  'مضخة بيتون',
  'قاطرة / ونش إنقاذ',
  'سيارة ضاغطة قمامة',
  'جبالة مع مقطورة',
  'براد (مبردة)',
  'رافعة هيدروليكية',
  'شاحنة',
  'شاحنة خفيفة / بيكاب',
  'حفارة أوتاد متحركة',
  'رافعة متحركة (ونش)',
  'حفارة آبار',
  'صهريج',
  'جبالة بيتون',
  'شفاط مجاري (صاروخ)',
  'أخرى',
] as const;

const RENTAL_TRUCK_GEAR_TYPES   = ['عادي', 'أوتوماتيك'] as const;
const RENTAL_TRUCK_FUEL_TYPES   = ['بنزين', 'بنزين + غاز (LPG)', 'مازوت / ديزل'] as const;
const RENTAL_TRUCK_CHAUFFEUR    = ['نعم', 'لا'] as const;
const RENTAL_TRUCK_DEPOSIT_TYPES = [
  'نقدي', 'تفويض مسبق (بطاقة)', 'سند أمانة / كمبيالة',
] as const;
const RENTAL_TRUCK_PAYMENT_METHODS = [
  'نقدي', 'بطاقة ائتمان', 'دفع بالتقسيط', 'الكل',
] as const;
const RENTAL_TRUCK_INSURANCE_TYPES = [
  'تأمين ضد الحوادث',
  'صيانة وتصليح',
  'تأمين الحوادث الشخصية',
  'تأمين سائق إضافي',
  'تأمين سيارات الإيجار',
  'تأمين شامل (Full)',
] as const;

const RENTAL_CLASSIC_BRANDS = [
  'Cadillac', 'Chevrolet', 'Chrysler', 'Citroen', 'DeSoto',
  'Ford', 'Jeep', 'Lincoln', 'Mercedes-Benz', 'Plymouth',
  'Pontiac', 'Porsche', 'Rolls Royce', 'Volkswagen', 'ماركات أخرى',
] as const;

const RENTAL_CLASSIC_BODY_TYPES = [
  'سيارة سياحية', 'سيارة دفع رباعي، جيب وبيكاب', 'دراجة نارية',
  'ليموزين', 'ميكروباص وباص', 'شاحنة خفيفة وشاحنة',
] as const;

const RENTAL_MINIVAN_BRANDS = [
  'Citroen', 'Dacia', 'Fiat', 'Ford', 'Gaz', 'Hyundai',
  'Iveco', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Opel',
  'Peugeot', 'Renault', 'Tenax', 'Toyota', 'Volkswagen',
] as const;

const RENTAL_SUV_BRANDS = [
  'Alfa Romeo', 'Audi', 'Bentley', 'BMW', 'BYD', 'Cadillac', 'Chery',
  'Chevrolet', 'Citroen', 'Cupra', 'Dacia', 'DS Automobiles', 'Fiat',
  'Ford', 'Hummer', 'Hyundai', 'Isuzu', 'Jaecoo', 'Jaguar', 'Jeep',
  'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln', 'Maserati',
  'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Oldsmobile',
  'Opel', 'Peugeot', 'Porsche', 'Renault', 'Seat', 'Skoda', 'SsangYong',
  'Suzuki', 'TOGG', 'Toyota', 'Volkswagen', 'Volvo',
] as const;

const RENTAL_CAR_ENGINE_CAPACITIES = [
  'حتى 1000 سم³', '1001 - 1300 سم³', '1301 - 1400 سم³', '1401 - 1600 سم³',
  '1601 - 1800 سم³', '1801 - 2000 سم³', '2001 - 2500 سم³', '2501 - 3000 سم³',
  '3001 - 3500 سم³', '3501 - 4000 سم³', '4001 - 10000 سم³',
] as const;

const RENTAL_CAR_TRANSMISSIONS = ['عادي', 'أوتوماتيك', 'شبه أوتوماتيك'] as const;

const RENTAL_CAR_FUEL_TYPES = [
  'بنزين', 'بنزين + غاز (LPG)', 'مازوت / ديزل', 'هجين (هايبرد)', 'كهربائي',
] as const;

const CHAUFFEUR_OPTIONS    = ['نعم', 'لا'] as const;
const RENTAL_DEPOSIT_TYPES = ['نقدي', 'تفويض مسبق (بطاقة)', 'سند أمانة / كمبيالة'] as const;
const RENTAL_PAYMENT_METHODS = ['نقدي', 'بطاقة ائتمان', 'دفع بالتقسيط', 'الكل'] as const;

const RENTAL_INSURANCE_TYPES = [
  'تأمين ضد الحوادث', 'صيانة وتصليح', 'تأمين الحوادث الشخصية',
  'تأمين سائق إضافي', 'تأمين سيارات الإيجار', 'تأمين شامل (Full)',
] as const;

const SUV_TRACTION_TYPES = [
  '4x2 (دفع خلفي)', '4x2 (دفع أمامي)', '4x4 (دفع رباعي)',
] as const;

const RENTAL_MINIVAN_BODY_TYPES = [
  'فان زجاجي', 'فان عادي', 'فان مغلق / بانيل فان', 'فان مبرد (براد)',
] as const;

const RENTAL_MOTORCYCLE_TYPES = [
  'دراجات رباعية (ATV)', 'تشوبر / كروزر', 'دراجات جبلية / كروس (Off-Road)',
  'إندورو', 'موبيد (دراجات خفيفة)', 'نيكد (Naked)', 'سكوتر / ماكسي سكوتر',
  'سياحية رياضية (Sport Touring)', 'سوبر سبورت (Supersport)', 'سياحية (Touring)',
] as const;

const RENTAL_MOTORCYCLE_YEARS = [
  '2026','2025','2024','2023','2022','2021','2020','2019','2018','2017',
  '2016','2015','2014','2013','2012','2011','2010','2009','2008','2007',
  '2006','2005','2004','2003','2002','2001','2000','1999','1998','1997',
  '1996','1995','1994','1993','1992','1991',
] as const;

const RENTAL_MOTORCYCLE_ENGINE_CAPS = [
  'حتى 50 سي سي', '51 - 125 سي سي', '126 - 250 سي سي',
  '251 - 650 سي سي', '651 - 1000 سي سي', 'أكثر من 1000 سي سي',
] as const;

const RENTAL_MOTORCYCLE_TRANSMISSIONS = ['عادي', 'أوتوماتيك'] as const;

const RENTAL_MOTORCYCLE_INSURANCE_TYPES = [
  'تأمين ضد الحوادث', 'صيانة وتصليح', 'تأمين الحوادث الشخصية',
  'تأمين سائق إضافي', 'تأمين دراجات الإيجار', 'تأمين شامل (Full)',
] as const;

// Vehicle types for the "Vehicles -> Rentals" category overview.
const RENTAL_VEHICLE_TYPES = [
  'سيارات سياحية',
  'دفع رباعي، جيب وبيكاب',
  'ميني فان وفانات تجارية',
  'دراجات نارية و ATV',
  'سيارات كلاسيكية',
  'باصات وميكروباص',
  'شاحنات، شاحنات خفيفة وقاطرات',
  'رافعات وسيارات إنقاذ',
  'مركبات جوية',
  'كرفانات',
  'سيارات كهربائية',
] as const;

const RESIDENTIAL_TRANSFER_TYPES = [
  'شقة',
  'فيلا',
] as const;

const COMMERCIAL_TRANSFER_SALE_TYPES = [
  'وكالة / مكتب خدمات', 'محطة وقود', 'عطار', 'حضانة وروضة أطفال', 'معرض ومركز صيانة سيارات',
  'ورشة', 'ستاند في مول', 'محل إكسسوارات', 'محل فطائر ومعجنات', 'كشك / بوفيه',
  'محل هواتف', 'مغسلة ملابس', 'مقهى شاي (شايجي)', 'محل زهور', 'مزرعة', 'محل شيغ كوفته',
  'مستودع', 'صالة أفراح', 'دكان ومحل تجاري', 'صيدلية', 'محل كهرباء وعدد', 'متجر إلكترونيات',
  'محطة طاقة', 'منطقة فعاليات', 'مصنع', 'استوديو تصوير', 'نادي ليلي', 'محل ملابس', 'محل بصريات',
  'مغسلة سجاد', 'دار رعاية مسنين', 'معمل / مشغل', 'مقهى إنترنت وألعاب',
  'كافيه', 'محل لحوم', 'مكتبة وقرطاسية', 'محل مستحضرات تجميل', 'حلاق',
  'مركز تعليمي', 'مصبغة', 'محل مكسرات', 'مدينة ألعاب', 'منجم', 'محل خضار', 'سوبر ماركت',
  'متجر مستلزمات طبية', 'بيت أزياء', 'عيادة', 'نقل وشحن', 'محل مواد بناء', 'مكتب', 'مدرسة',
  'موقف سيارات', 'مركز صيانة سيارات', 'محل قطع غيار', 'مغسلة سيارات', 'سكن طلابي',
  'مخبز وحلويات', 'بازار', 'محل حيوانات أليفة', 'منطقة تنزه', 'بلازا', 'محطة راديو وتلفزيون',
  'مطعم', 'مركز صحي', 'سوق خضار', 'مستودع تبريد', 'منشأة رياضية', 'موزع مياه وغاز',
  'محل أجبان وألبان', 'موقف سيارات أجرة', 'ورشة إصلاح',
  'خياط', 'محل خردوات', 'عيادة بيطرية', 'محل أدوات منزلية',
] as const;

const COMMERCIAL_TRANSFER_RENT_TYPES = [
  'وكالة / مكتب خدمات', 'محطة وقود', 'عطار وبائع توابل', 'حضانة وروضة أطفال', 'معرض ومركز صيانة سيارات',
  'ورشة', 'ستاند في مول', 'بائع أسماك', 'محل إكسسوارات', 'محل فطائر ومعجنات', 'كشك / بوفيه',
  'محل هواتف', 'مغسلة ملابس', 'مقهى شاي (شايجي)', 'محل زهور ونباتات', 'مزرعة', 'محل شيغ كوفته',
  'مستودع ومخزن', 'دكان ومحل تجاري', 'صيدلية', 'كهربائيات ومواد بناء', 'متجر إلكترونيات',
  'محطة طاقة', 'منطقة فعاليات', 'مصنع ومنشأة إنتاج', 'استوديو تصوير', 'محل ملابس', 'محل بصريات',
  'مغسلة سجاد', 'حمام وساونا', 'دار رعاية مسنين', 'معمل / مشغل', 'كافيه', 'مقصف', 'محل لحوم',
  'صالة أفراح', 'مكتبة وقرطاسية', 'محل مستحضرات تجميل', 'حلاق', 'مركز تعليمي', 'مصبغة', 'محل مكسرات',
  'محل مجوهرات', 'مدينة ألعاب', 'محل خضار', 'سوبر ماركت', 'مطبعة', 'متجر مستلزمات طبية', 'بيت أزياء',
  'عيادة', 'نقل وشحن', 'محل خردوات وبناء', 'مكتب', 'مدرسة', 'موقف سيارات', 'مركز صيانة سيارات',
  'محل قطع غيار سيارات', 'مغسلة سيارات', 'سكن طلابي', 'مخبز وحلويات', 'بازار', 'محل حيوانات أليفة',
  'منطقة تنزه وحديقة فطور', 'بلازا', 'استوديو تسجيل', 'محطة راديو وتلفزيون', 'مطعم', 'متجر ساعات',
  'مركز صحي', 'سوق جملة خضار', 'مستودع تبريد', 'منشأة رياضية', 'موزع مياه وغاز', 'محل أجبان وألبان',
  'موقف سيارات أجرة', 'ورشة إصلاح', 'خدمات تقنية', 'خياط', 'قاعة اجتماعات', 'لوازم خياطة',
  'مرافق عامة', 'عيادة بيطرية', 'محل أدوات منزلية',
] as const;

const COMMERCIAL_FOR_RENT_TYPES = [
  'شقة ضمن عمارة',
  'ورشة',
  'مزرعة',
  'مستودع ومخزن',
  'صالة أفراح',
  'دكان ومحل تجاري',
  'مصنع ومنشأة إنتاج',
  'كراج وموقف سيارات',
  'حمام، ساونا وسبا',
  'مكتب جاهز وافتراضي',
  'معمل / مشغل',
  'مكتب أو طابق في بناء تجاري',
  'مقهى وبار',
  'بناء كامل',
  'منجم',
  'مكتب',
  'مدرسة',
  'موقف سيارات',
  'مغسلة وتلميع سيارات',
  'سوق (بازار)',
  'منطقة تنزه وحديقة فطور',
  'بلازا / مجمع تجاري',
  'مكتب أو طابق في بلازا',
  'مكتب أو طابق في ريزيدانس',
  'مركز صحي',
  'منشأة رياضية',
  'قاعة اجتماعات وفعاليات',
  'فيلا',
  'سكن طلابي',
] as const;

const COMMERCIAL_FOR_SALE_TYPES = [
  'محطة وقود',
  'شقة ضمن عمارة',
  'ورشة',
  'مزرعة',
  'مستودع ومخزن',
  'صالة أفراح',
  'دكان ومحل تجاري',
  'مصنع ومنشأة إنتاج',
  'كراج وموقف سيارات',
  'حمام، ساونا وسبا',
  'معمل / مشغل',
  'مكتب أو طابق في بناء تجاري',
  'مقهى وبار',
  'بناء كامل',
  'منجم',
  'مكتب',
  'مدرسة',
  'موقف سيارات',
  'مغسلة وتلميع سيارات',
  'سوق (بازار)',
  'منطقة تنزه وحديقة فطور',
  'بلازا / مجمع تجاري',
  'مكتب أو طابق في بلازا',
  'مكتب أو طابق في ريزيدانس',
  'منشأة رياضية',
  'فيلا',
  'سكن طلابي',
] as const;

const RESIDENTIAL_DAILY_RENTAL_TYPES = [
  'شقة',
  'ريزيدانس (شقق فاخرة)',
  'بيت مستقل',
  'فيلا',
  'ملكية مشتركة (تايم شير)',
  'شقق فندقية وبانسيون',
] as const;

const RESIDENTIAL_FOR_RENT_TYPES = [
  'شقة',
  'ريزيدانس (شقق فاخرة)',
  'بيت مستقل',
  'فيلا',
  'مزرعة / بيت ريفي',
  'قصر',
  'فيلا بحرية (يالي)',
  'شقة بحرية',
] as const;

const SMALL_TRAILER_TYPES = [
  'مقطورات الشاحنات',
  'مقطورات زراعية',
  'مقطورات نقل',
  'مقطورات للأغراض الخاصة',
] as const;

// Trailer types are the primary classification (not brands) for this category.
// They slot into the same brand-list/brand-selected CatView so the UI is identical.
const TRAILER_TYPES = [
  'قلاب',
  'لوبيد (Lowbed)',
  'حمولة جافة',
  'ذات شادر',
  'مبردة (براد)',
  'صهريج',
  'لنقل المنسوجات',
  'سايلوباس (Silobas)',
  'حاملة حاويات وشاسيه',
  'مقطورات للأغراض الخاصة',
] as const;

// ── Tractor-truck-specific filter data ───────────────────────────────────────

const TRACTOR_FUEL_TYPES = [
  'بنزين', 'بنزين + غاز (LPG)', 'ديزل', 'غاز طبيعي مسال (LNG)',
] as const;

const TRACTOR_TRANSMISSIONS = [
  { value: 'MANUAL',    label: 'عادي (يدوي)' },
  { value: 'AUTOMATIC', label: 'أوتوماتيك'   },
] as const;

const TRACTOR_BEDS              = ['بدون', '1', '2'] as const;
const TRACTOR_TRAILER_INCLUDED  = ['يوجد', 'لا يوجد'] as const;

// ── Truck-specific filter data ────────────────────────────────────────────────

const SUPERSTRUCTURE_TYPES = [
  'صندوق مفتوح', 'قلاب خشبي', 'صندوق خشبي',
  'سيارة إسعاف', 'سيارة نقل موتى', 'سيارة جمع قمامة',
] as const;

const PAYLOAD_CAPACITIES = [
  '0 - 1.500', '1.501 - 3.000', '3.001 - 3.500', '3.501 - 5.000',
  '5.001 - 10.000', '10.001 - 20.000', '20.001 - 30.000', '30.001 - 40.000',
] as const;

const TRUCK_DRIVETRAINS = [
  '4x2', '4x4', '6x2', '6x4', '6x6', '8x2', '8x2x2', '8x2x4', '8x4x4', '8x8x4',
] as const;

const TRUCK_TRANSMISSIONS = [
  { value: 'MANUAL',    label: 'عادي (يدوي)' },
  { value: 'AUTOMATIC', label: 'أوتوماتيك'   },
] as const;

// ── Bus-specific filter data ───────────────────────────────────────────────────

const SEAT_LAYOUTS       = ['2+1', '2+2'] as const;
const SEATBACK_SCREENS   = ['بدون', '7', '9', '10'] as const;
const GEAR_COUNTS        = ['6+1', '8+1', '12+1', 'أخرى'] as const;
const BUS_TRANSMISSIONS  = [
  { value: 'MANUAL',    label: 'عادي (يدوي)' },
  { value: 'AUTOMATIC', label: 'أوتوماتيك'   },
] as const;

const MINIBUS_BRANDS = [
  'BMC', 'Citroen', 'Fiat', 'Ford Otosan', 'GAZ', 'Hyundai', 'Isuzu',
  'Iveco - Otoyol', 'Karsan', 'Kia', 'Magirus', 'MAN', 'Mercedes-Benz',
  'Mitsubishi', 'Opel', 'Otokar', 'Peugeot', 'Renault', 'Temsa', 'Volkswagen',
] as const;

// ── Minibus-specific filter data ──────────────────────────────────────────────

const MINIBUS_ENGINE_CAPACITIES = [
  'حتى 1300 سم³', '1301 - 1600 سم³', '1601 - 1800 سم³', '1801 - 2000 سم³',
  '2001 - 2500 سم³', '2501 - 3000 سم³', '3001 - 3500 سم³', '3501 - 4000 سم³',
  '4001 - 4500 سم³', '4501 - 5000 سم³', '5001 سم³ وما فوق',
] as const;

const MINIBUS_ENGINE_POWERS = [
  'حتى 100 حصان', '101 - 125 حصان', '126 - 150 حصان', '151 - 175 حصان',
  '176 - 200 حصان', '201 - 225 حصان', '226 - 250 حصان', '251 - 275 حصان',
  '276 - 300 حصان', '301 - 325 حصان', '326 - 350 حصان', '351 - 375 حصان',
  '376 - 400 حصان', '401 - 425 حصان', '426 - 450 حصان', '451 - 475 حصان',
  '476 - 500 حصان', '501 حصان وما فوق',
] as const;

const MINIBUS_SEAT_COUNTS = [
  '8+1', '9+1', '10+1', '11+1', '12+1', '13+1', '14+1', '15+1', '16+1',
  '17+1', '18+1', '19+1', '20+1', '21+1', '22+1', '23+1', '24+1', '25+1',
  '26+1', '27+1', '28+1', '29+1', '30+1', '31+1', '32+1', '33+1', '34+1', '35+1',
] as const;

const ROOF_TYPES = ['سقف عادي', 'سقف عالي'] as const;

const MINIBUS_CHASSIS = ['قصير', 'متوسط', 'طويل', 'طويل جداً'] as const;

const MINIBUS_TRANSMISSIONS = [
  { value: 'MANUAL',    label: 'عادي (يدوي)' },
  { value: 'AUTOMATIC', label: 'أوتوماتيك'   },
] as const;

const MINIBUS_DRIVETRAINS = [
  { value: 'FWD', label: 'دفع أمامي'              },
  { value: 'RWD', label: 'دفع خلفي'               },
  { value: '4WD', label: 'دفع رباعي 4WD (مستمر)'  },
  { value: 'AWD', label: 'دفع كلي AWD (إلكتروني)' },
] as const;

// ── Minivan-specific filter data ──────────────────────────────────────────────

const MINIVAN_BODY_TYPES = [
  'فان بزجاج', 'فان نصف زجاج', 'بانيل فان / مغلق', 'فان مبرد', 'ميكروباص',
] as const;

const MINIVAN_CHASSIS = ['قصير (قياسي)', 'متوسط', 'طويل'] as const;

const MINIVAN_ENGINE_POWERS = [
  'حتى 50 حصان', '51 - 75 حصان', '76 - 100 حصان', '101 - 125 حصان',
  '126 - 150 حصان', '151 - 175 حصان', '176 - 200 حصان', '201 - 225 حصان',
  '226 - 250 حصان', '251 - 275 حصان', '276 - 300 حصان', '301 - 325 حصان',
  '326 - 350 حصان', '351 - 375 حصان', '376 - 400 حصان', '401 - 425 حصان',
  '426 - 450 حصان', '451 - 475 حصان', '476 - 500 حصان', '501 حصان وما فوق',
] as const;

const MINIVAN_ENGINE_CAPACITIES = [
  'حتى 1300 سم³', '1301 - 1600 سم³', '1601 - 1800 سم³', '1801 - 2000 سم³',
  '2001 - 2500 سم³', '2501 - 3000 سم³', '3001 - 3500 سم³', '3501 - 4000 سم³',
  '4001 - 4500 سم³', '4501 - 5000 سم³', '5001 سم³ وما فوق',
] as const;

const SEAT_COUNTS = [
  '1+1', '2+1', '3+1', '4+1', '5+1', '6+1', '7+1', '8+1',
  '9+1', '10+1', '11+1', '12+1', '13+1', '14+1', '15+1',
] as const;

const MINIVAN_TRANSMISSIONS = [
  { value: 'MANUAL',    label: 'عادي (يدوي)' },
  { value: 'AUTOMATIC', label: 'أوتوماتيك'   },
] as const;

const MINIVAN_DRIVETRAINS = [
  { value: 'FWD', label: '4x2 (دفع أمامي)' },
  { value: 'RWD', label: '4x2 (دفع خلفي)'  },
  { value: '4WD', label: '4x4 (دفع رباعي)' },
] as const;

// ── Motorcycle-specific filter data ──────────────────────────────────────────

const MOTO_CONDITIONS  = ['مستعمل', 'جديد مستورد', 'جديد من الوكيل'] as const;
const MOTO_TYPES       = [
  'موبيد (Moped)', 'كاب (Cub)', 'كوميوتر (Commuter)', 'سكوتر / ماكسي سكوتر',
  'تورينغ (سياحي)', 'سبورت تورينغ', 'تشوبر / كروزر', 'إندورو / أوف رود',
  'سوبر سبورت', 'نيكد / رودستر', 'كروس / موتوكروس', 'ترايال (Trial)',
  'دراجة بثلاث عجلات (Trike)', 'دراجة ثلجية',
] as const;
const ENGINE_CAPACITIES = [
  '0 - 50 cc', '51 - 99 cc', '100 - 125 cc', '126 - 150 cc',
  '151 - 250 cc', '251 - 350 cc', '351 - 450 cc', '451 - 550 cc',
  '551 - 650 cc', '651 - 800 cc', '801 - 1000 cc', '1001 - 1200 cc',
  '1201 - 1500 cc', '1501 cc وما فوق',
] as const;
const ENGINE_POWERS = [
  'حتى 25 حصان', '26 - 50 حصان', '51 - 75 حصان', '76 - 100 حصان',
  '101 - 125 حصان', '126 - 150 حصان', '151 - 175 حصان', '176 - 200 حصان',
  '201 - 225 حصان', '225 - 250 حصان', '251 حصان وما فوق',
] as const;
const STROKE_TYPES       = ['ثنائي الأشواط (2-Stroke)', 'رباعي الأشواط (4-Stroke)'] as const;
const CYLINDER_COUNTS    = ['أسطوانة واحدة', 'أسطوانتين', '3 أسطوانات', '4 أسطوانات', '6 أسطوانات فأكثر'] as const;
const MOTO_TRANSMISSIONS = ['عادي (يدوي)', 'نصف أوتوماتيك', 'أوتوماتيك'] as const;
const COOLING_SYSTEMS    = ['تبريد هواء', 'تبريد ماء', 'تبريد زيت'] as const;
const MOTO_COLORS        = [
  'أبيض', 'عنابي', 'رمادي', 'فضي', 'بني', 'أحمر', 'كحلي', 'أزرق',
  'بنفسجي', 'وردي', 'أصفر', 'أسود', 'برتقالي', 'أخضر', 'لون مزدوج',
] as const;
const MOTO_ORIGINS = [
  'الولايات المتحدة', 'ألمانيا', 'النمسا', 'بيلاروسيا', 'التشيك',
  'الصين', 'فرنسا', 'كوريا الجنوبية', 'الهند', 'بريطانيا', 'إسبانيا',
  'السويد', 'سويسرا', 'إيطاليا', 'اليابان', 'كندا', 'ماليزيا',
  'بولندا', 'البرتغال', 'روسيا', 'تركيا', 'تايوان',
] as const;

// ── Filter value types ────────────────────────────────────────────────────────

export interface FilterValues {
  categoryId:        string;
  make:              string;
  model:             string;
  city:              string;
  district:          string;
  minPrice:          string;
  maxPrice:          string;
  currency:          'SYP' | 'USD';
  minYear:           string;
  maxYear:           string;
  minMileage:        string;
  maxMileage:        string;
  minRange:          string;
  maxRange:          string;
  fuelTypes:         string[];
  transmissions:     string[];
  conditions:        string[];
  bodyType:          string;
  drivetrains:       string[];
  colors:            string[];
  warranty:          '' | 'true' | 'false';
  heavyDamage:       '' | 'true' | 'false';
  tradeIn:           '' | 'true' | 'false';
  fromWhos:          string[];
  // motorcycle-specific
  motoConditions:    string[];
  motoType:          string;
  engineCapacity:    string;
  enginePower:       string;
  strokeType:        string[];
  cylinderCount:     string;
  motoTransmissions: string[];
  coolingSystems:    string[];
  origin:            string;
  // minivan-specific
  minivanBodyType:      string;
  minivanChassis:       string;
  minivanEnginePower:   string;
  minivanEngineCapacity: string;
  seatCount:            string;
  // minibus-specific
  minibusEngineCapacity: string;
  minibusEnginePower:    string;
  minibusSeatCount:      string;
  roofType:              string;
  minibusChassis:        string;
  // bus-specific
  seatLayout:     string;
  seatbackScreen: string;
  gearCount:      string;
  minPassengers:  string;
  maxPassengers:  string;
  minFuelTank:    string;
  maxFuelTank:    string;
  // truck-specific
  truckEngineCapacity: string;
  truckEnginePower:    string;
  superstructureType:  string;
  payloadCapacity:     string;
  truckDrivetrain:     string;
  // tractor-truck-specific
  tractorEngineCapacity:   string;
  tractorEnginePower:      string;
  tractorBed:              string;
  tractorTrailerIncluded:  string;
  tractorFuelType:         string;
  // residential-for-sale-specific
  minGrossArea:        string;
  maxGrossArea:        string;
  minNetArea:          string;
  maxNetArea:          string;
  minOpenArea:         string;
  maxOpenArea:         string;
  roomCount:           string;
  buildingAge:         string;
  floorNumber:         string;
  totalFloors:         string;
  heatingType:         string;
  bathroomCount:       string;
  kitchenType:         string;
  hasBalcony:          '' | 'true' | 'false';
  hasElevator:         '' | 'true' | 'false';
  isFurnished:         '' | 'true' | 'false';
  isInComplex:         '' | 'true' | 'false';
  parkingType:         string;
  usageStatus:         string;
  deedStatus:          string;
  fromWhosRealEstate:  string[];
  // land (for-sale and share)
  minPricePerM2:      string;
  maxPricePerM2:      string;
  pricePerM2Currency: 'SYP' | 'USD';
  minLandArea:    string;
  maxLandArea:    string;
  minBlockNo:     string;
  maxBlockNo:     string;
  minParcelNo:    string;
  maxParcelNo:    string;
  zoningStatus:   string;
  kaks:           string;
  gabari:         string;
  landDeedStatus: string;
  fromWhosLand:   string[];
  hasDeposit:        '' | 'true' | 'false';
  projectStatus:     string;
  apartmentsPerFloor:   string;
  fromWhosBuilding:    string[];
  timesharePeriod:       string;
  timeshareCondition:    string;
  fromWhosTimeshare:     string[];
  rentDuration:          string;
  guestCapacity:         string;
  bedCount:              string;
  fromWhosTimeshareRent:      string[];
  touristFacilityCondition:   string;
  // pools-for-rent-specific
  poolRentalDuration: string;
  poolCapacity:       string;
  poolDepth:          string;
  poolFacilities:     string[];
  fromWhosPool:       string[];
  // rental-cars-specific
  minWeeklyPrice:       string;
  maxWeeklyPrice:       string;
  minMonthlyPrice:      string;
  maxMonthlyPrice:      string;
  rentalEngineCapacity: string;
  rentalTransmission:   string;
  rentalFuelType:       string;
  withChauffeur:        string;
  rentalDepositType:    string;
  rentalPaymentMethod:  string;
  insuranceTypes:       string[];
  suvTractionType:         string;
  rentalMinivanBodyType:   string;
  rentalMotoYear:          string;
  rentalClassicBodyType:   string;
  // rental-bus-specific
  minBusPassengers: string;
  maxBusPassengers: string;
  // rental-truck-specific
  rentalTruckType:  string;
  minLoadCapacity:  string;
  maxLoadCapacity:  string;
  // rental-caravan-specific
  caravanYear:      string;
  caravanInsurance: string;
  minBedCapacity:   string;
  maxBedCapacity:   string;
  // marine-for-sale-specific
  marineSellerType: string;
  marineCondition:  string;
  marineExchange:   string;
  // damaged-vehicles-specific
  damagedExchange:    string;
  damagedYear:        string;
  damagedGear:        string;
  damagedFuel:        string;
  damagedParkingFee:  string;
  damagedSalesStatus: string;
  damagedDamageCause: string;
  damagedSeller:      string;
  damagedMotoStatus:  string;
}

export const EMPTY_FILTERS: FilterValues = {
  categoryId: '', make: '', model: '', city: '', district: '',
  minPrice: '', maxPrice: '', currency: 'SYP',
  minYear: '', maxYear: '', minMileage: '', maxMileage: '',
  minRange: '', maxRange: '',
  fuelTypes: [], transmissions: [], conditions: [],
  bodyType: '', drivetrains: [], colors: [],
  warranty: '', heavyDamage: '', tradeIn: '', fromWhos: [],
  motoConditions: [], motoType: '', engineCapacity: '', enginePower: '',
  strokeType: [], cylinderCount: '', motoTransmissions: [], coolingSystems: [],
  origin: '',
  minivanBodyType: '', minivanChassis: '', minivanEnginePower: '',
  minivanEngineCapacity: '', seatCount: '',
  minibusEngineCapacity: '', minibusEnginePower: '', minibusSeatCount: '',
  roofType: '', minibusChassis: '',
  seatLayout: '', seatbackScreen: '', gearCount: '',
  minPassengers: '', maxPassengers: '', minFuelTank: '', maxFuelTank: '',
  truckEngineCapacity: '', truckEnginePower: '', superstructureType: '',
  payloadCapacity: '', truckDrivetrain: '',
  tractorEngineCapacity: '', tractorEnginePower: '', tractorBed: '',
  tractorTrailerIncluded: '', tractorFuelType: '',
  minGrossArea: '', maxGrossArea: '', minNetArea: '', maxNetArea: '',
  minOpenArea: '', maxOpenArea: '',
  roomCount: '', buildingAge: '', floorNumber: '', totalFloors: '',
  heatingType: '', bathroomCount: '', kitchenType: '',
  hasBalcony: '', hasElevator: '', isFurnished: '', isInComplex: '',
  parkingType: '', usageStatus: '', deedStatus: '',
  fromWhosRealEstate: [],
  minPricePerM2: '', maxPricePerM2: '', pricePerM2Currency: 'SYP',
  minLandArea: '', maxLandArea: '', minBlockNo: '', maxBlockNo: '',
  minParcelNo: '', maxParcelNo: '', zoningStatus: '', kaks: '', gabari: '',
  landDeedStatus: '', fromWhosLand: [], hasDeposit: '', projectStatus: '',
  apartmentsPerFloor: '', fromWhosBuilding: [],
  timesharePeriod: '', timeshareCondition: '', fromWhosTimeshare: [],
  rentDuration: '', guestCapacity: '', bedCount: '', fromWhosTimeshareRent: [],
  touristFacilityCondition: '',
  poolRentalDuration: '', poolCapacity: '', poolDepth: '',
  poolFacilities: [], fromWhosPool: [],
  minWeeklyPrice: '', maxWeeklyPrice: '', minMonthlyPrice: '', maxMonthlyPrice: '',
  rentalEngineCapacity: '', rentalTransmission: '', rentalFuelType: '',
  withChauffeur: '', rentalDepositType: '', rentalPaymentMethod: '',
  insuranceTypes: [],
  suvTractionType: '', rentalMinivanBodyType: '', rentalMotoYear: '',
  rentalClassicBodyType: '',
  minBusPassengers: '', maxBusPassengers: '',
  rentalTruckType: '', minLoadCapacity: '', maxLoadCapacity: '',
  caravanYear: '', caravanInsurance: '', minBedCapacity: '', maxBedCapacity: '',
  marineSellerType: '', marineCondition: '', marineExchange: '',
  damagedExchange: '', damagedYear: '', damagedGear: '', damagedFuel: '',
  damagedParkingFee: '', damagedSalesStatus: '', damagedDamageCause: '', damagedSeller: '',
  damagedMotoStatus: '',
};

export function hasActiveFilters(f: FilterValues): boolean {
  return !!(
    f.categoryId || f.make || f.model || f.city || f.district ||
    f.minPrice || f.maxPrice || f.minYear || f.maxYear ||
    f.minMileage || f.maxMileage || f.minRange || f.maxRange ||
    f.fuelTypes.length || f.transmissions.length || f.conditions.length ||
    f.bodyType || f.drivetrains.length || f.colors.length ||
    f.warranty || f.heavyDamage || f.tradeIn || f.fromWhos.length ||
    f.motoConditions.length || f.motoType || f.engineCapacity || f.enginePower ||
    f.strokeType.length || f.cylinderCount || f.motoTransmissions.length ||
    f.coolingSystems.length || f.origin ||
    f.minivanBodyType || f.minivanChassis || f.minivanEnginePower ||
    f.minivanEngineCapacity || f.seatCount ||
    f.minibusEngineCapacity || f.minibusEnginePower || f.minibusSeatCount ||
    f.roofType || f.minibusChassis ||
    f.seatLayout || f.seatbackScreen || f.gearCount ||
    f.minPassengers || f.maxPassengers || f.minFuelTank || f.maxFuelTank ||
    f.truckEngineCapacity || f.truckEnginePower || f.superstructureType ||
    f.payloadCapacity || f.truckDrivetrain ||
    f.tractorEngineCapacity || f.tractorEnginePower || f.tractorBed ||
    f.tractorTrailerIncluded || f.tractorFuelType ||
    f.minGrossArea || f.maxGrossArea || f.minNetArea || f.maxNetArea ||
    f.minOpenArea || f.maxOpenArea || f.roomCount || f.buildingAge ||
    f.floorNumber || f.totalFloors || f.heatingType || f.bathroomCount ||
    f.kitchenType || f.hasBalcony || f.hasElevator || f.isFurnished ||
    f.isInComplex || f.parkingType || f.usageStatus || f.deedStatus ||
    f.fromWhosRealEstate.length ||
    f.minPricePerM2 || f.maxPricePerM2 ||
    f.minLandArea || f.maxLandArea || f.minBlockNo || f.maxBlockNo ||
    f.minParcelNo || f.maxParcelNo || f.zoningStatus || f.kaks || f.gabari ||
    f.landDeedStatus || f.fromWhosLand.length || f.hasDeposit || f.projectStatus ||
    f.apartmentsPerFloor || f.fromWhosBuilding.length ||
    f.timesharePeriod || f.timeshareCondition || f.fromWhosTimeshare.length ||
    f.rentDuration || f.guestCapacity || f.bedCount || f.fromWhosTimeshareRent.length ||
    f.touristFacilityCondition ||
    f.poolRentalDuration || f.poolCapacity || f.poolDepth ||
    f.poolFacilities.length || f.fromWhosPool.length ||
    f.minWeeklyPrice || f.maxWeeklyPrice || f.minMonthlyPrice || f.maxMonthlyPrice ||
    f.rentalEngineCapacity || f.rentalTransmission || f.rentalFuelType ||
    f.withChauffeur || f.rentalDepositType || f.rentalPaymentMethod ||
    f.insuranceTypes.length ||
    f.suvTractionType || f.rentalMinivanBodyType || f.rentalMotoYear ||
    f.rentalClassicBodyType ||
    f.minBusPassengers || f.maxBusPassengers ||
    f.rentalTruckType || f.minLoadCapacity || f.maxLoadCapacity ||
    f.caravanYear || f.caravanInsurance || f.minBedCapacity || f.maxBedCapacity ||
    f.marineSellerType || f.marineCondition || f.marineExchange ||
    f.damagedExchange || f.damagedYear || f.damagedGear || f.damagedFuel ||
    f.damagedParkingFee || f.damagedSalesStatus || f.damagedDamageCause || f.damagedSeller ||
    f.damagedMotoStatus
  );
}

// ── Category tree utilities ───────────────────────────────────────────────────

function findCategoryById(cats: Category[], id: string): Category | undefined {
  for (const cat of cats) {
    if (cat.id === id) return cat;
    const found = cat.children ? findCategoryById(cat.children, id) : undefined;
    if (found) return found;
  }
}

function findRootCategory(cats: Category[], id: string): Category | undefined {
  for (const cat of cats) {
    if (cat.id === id) return cat;
    if (cat.children && findCategoryById(cat.children, id)) return cat;
  }
}

// Arabic car-level category names that should show the brand picker.
// The parent "مركبات / vehicles" is intentionally excluded so it shows its
// sub-category tree instead of jumping straight to brands.
const ARABIC_CAR_CATEGORIES = new Set([
  'سيارات', 'سيارات كهربائية', 'سيارات متضررة', 'سيارات كلاسيكية',
  'سيارات عائلية (SUV) وبيكاب', 'سيارات ذوي الاحتياجات الخاصة',
]);

function isBrandCategory(cat: Category | undefined): boolean {
  if (!cat) return false;
  if (ARABIC_CAR_CATEGORIES.has(cat.name)) return true;
  const n = cat.name.toLowerCase().replace(/\s+/g, '');
  const s = (cat.slug ?? '').toLowerCase().replace(/-/g, '');
  // 'car' (not 'vehicles') so slug:'cars' matches but slug:'vehicles' does not
  return [
    'otomobil', 'vasita', 'vasıta', 'arac', 'araç', 'automobile', 'autoworld', 'car',
  ].some((kw) => n.includes(kw) || s.includes(kw));
}

function isElectricCategory(cat: Category | undefined): boolean {
  if (!cat) return false;
  if (cat.name === 'سيارات كهربائية') return true;
  const s = (cat.slug ?? '').toLowerCase();
  return s === 'electric' || s.endsWith('/electric');
}

function brandsFor(cat: Category | undefined): readonly string[] {
  return isElectricCategory(cat) ? ELECTRIC_BRANDS : CAR_BRANDS;
}

// ── Primitive building blocks ─────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}

function Accordion({
  title, badge, defaultOpen = true, children,
}: {
  title: string; badge?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2.5 text-sm font-bold text-gray-800 hover:text-gray-900 transition-colors"
      >
        <span className="flex items-center gap-2">
          {title}
          {!!badge && (
            <span className="bg-orange-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-gray-400 transition-transform shrink-0', open && 'rotate-180')}
        />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function CheckItem({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 py-[5px] cursor-pointer group select-none" onClick={onChange}>
      <span
        className={cn(
          'w-[16px] h-[16px] rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-all',
          checked
            ? 'bg-orange-500 border-orange-500'
            : 'border-gray-300 bg-white group-hover:border-orange-300',
        )}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[13px] text-gray-700 group-hover:text-gray-900 leading-tight">{label}</span>
    </label>
  );
}

function YesNoRadio({ value, onChange }: {
  value: '' | 'true' | 'false'; onChange: (v: '' | 'true' | 'false') => void;
}) {
  const opts: Array<['' | 'true' | 'false', string]> = [
    ['', 'لا يهم'], ['true', 'نعم'], ['false', 'لا'],
  ];
  return (
    <div className="flex gap-1.5">
      {opts.map(([val, label]) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={cn(
            'flex-1 text-[11px] font-semibold py-1.5 rounded-lg border transition-all',
            value === val
              ? 'bg-orange-500 border-orange-500 text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function RangeInputs({ minVal, maxVal, onMin, onMax, ph = ['Min', 'Max'] }: {
  minVal: string; maxVal: string;
  onMin: (v: string) => void; onMax: (v: string) => void;
  ph?: [string, string];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" value={minVal} onChange={(e) => onMin(e.target.value)}
        placeholder={ph[0]}
        className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white placeholder:text-gray-300"
      />
      <span className="text-gray-300 text-xs shrink-0">—</span>
      <input type="number" value={maxVal} onChange={(e) => onMax(e.target.value)}
        placeholder={ph[1]}
        className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white placeholder:text-gray-300"
      />
    </div>
  );
}

// ── ModelCombobox ─────────────────────────────────────────────────────────────
// Fetches available models for the selected make from GET /catalog/models?make=...
// Allows free-text entry for models not in the list — backend learns them over time.

function ModelCombobox({ make, value, onChange, onCommit }: {
  make: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
}) {
  const [input,       setInput]       = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open,        setOpen]        = useState(false);
  const [fetching,    setFetching]    = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync controlled value when URL navigation resets props
  useEffect(() => { setInput(value); }, [value]);

  // Fetch model list whenever make changes
  useEffect(() => {
    if (!make) { setSuggestions([]); return; }
    let cancelled = false;
    setFetching(true);
    api.get<ApiResponse<unknown>>(`/catalog/models?make=${encodeURIComponent(make)}`)
      .then((r) => {
        if (cancelled) return;
        const raw = (r as { data?: unknown })?.data;
        // Guard: keep only plain strings — backend may return objects or null elements
        setSuggestions(
          Array.isArray(raw)
            ? (raw as unknown[]).filter((s): s is string => typeof s === 'string' && s.length > 0)
            : [],
        );
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [make]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ensure only strings reach the render — guards against unexpected API shapes
  const safeItems = suggestions.filter((s): s is string => typeof s === 'string');
  const filtered = input.trim()
    ? safeItems.filter((s) => s.toLowerCase().includes(input.toLowerCase()))
    : safeItems;

  // True when the user typed something not already exactly in the list
  const hasCustomEntry =
    input.trim().length > 0 &&
    !filtered.some((s) => s.toLowerCase() === input.trim().toLowerCase());

  const commit = (model: string) => {
    const clean = model.trim();
    setInput(clean);
    setOpen(false);
    onChange(clean);
    onCommit(clean);
  };

  const showDropdown = open && (filtered.length > 0 || hasCustomEntry);

  return (
    <div ref={wrapRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={input}
          placeholder="ابحث عن الموديل أو اكتبه..."
          onChange={(e) => { setInput(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) { e.preventDefault(); commit(input); }
            if (e.key === 'Escape') setOpen(false);
          }}
          className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:border-orange-400 bg-white placeholder:text-gray-300 transition-colors"
        />
        {input ? (
          <button
            type="button"
            onClick={() => commit('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            aria-label="مسح الموديل"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : fetching ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin" />
          </span>
        ) : null}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((model) => (
              <button
                key={model}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); commit(model); }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-[13px] hover:bg-orange-50 hover:text-orange-600 transition-colors',
                  value === model && 'bg-orange-50 text-orange-600 font-semibold',
                )}
              >
                {model}
              </button>
            ))}

            {/* Custom entry hint — shown when input doesn't match anything exactly */}
            {hasCustomEntry && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); commit(input); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-[13px] text-gray-500 hover:bg-gray-50 flex items-center gap-1.5 transition-colors',
                  filtered.length > 0 && 'border-t border-gray-100',
                )}
              >
                <Search className="w-3 h-3 shrink-0 text-gray-400" />
                <span>
                  <strong className="text-gray-700">&ldquo;{input.trim()}&rdquo;</strong>
                  {' '}ابحث عنه
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CategoryNode ──────────────────────────────────────────────────────────────

function CategoryNode({ cat, depth, selectedId, onSelect }: {
  cat: Category; depth: number; selectedId: string; onSelect: (id: string) => void;
}) {
  const hasChildren = (cat.children?.length ?? 0) > 0;
  const isSelected  = selectedId === cat.id;

  function isDescendantSelected(node: Category): boolean {
    if (node.id === selectedId) return true;
    return node.children?.some(isDescendantSelected) ?? false;
  }

  const [expanded, setExpanded] = useState(() => isDescendantSelected(cat));

  return (
    <li>
      <div
        className={cn(
          'flex items-center text-[13px] rounded-lg transition-colors',
          isSelected
            ? 'bg-orange-50 text-orange-600 font-semibold'
            : 'text-gray-700 hover:bg-gray-50',
        )}
        style={{ paddingLeft: `${6 + depth * 14}px`, paddingRight: '4px' }}
      >
        <button
          type="button"
          aria-label={expanded ? 'طيّ' : 'توسيع'}
          className="w-7 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((prev) => !prev);
          }}
        >
          {hasChildren
            ? expanded
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
            : null}
        </button>

        <button
          type="button"
          className="flex-1 text-left py-2 truncate"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(cat.id);
          }}
        >
          {cat.name}
        </button>
      </div>

      {hasChildren && expanded && (
        <ul>
          {cat.children!.map((child) => (
            <CategoryNode
              key={child.id}
              cat={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── FilterSidebar (main export) ───────────────────────────────────────────────

interface FilterSidebarProps {
  categories: Category[];
  applied: FilterValues;
  onApply: (f: FilterValues) => void;
}

export function FilterSidebar({ categories, applied, onApply }: FilterSidebarProps) {
  const pathname     = usePathname();
  const isRentalElectric = pathname.includes('/vehicles/rentals/electric');
  const isElectric   = pathname.includes('/electric') && !isRentalElectric;
  const isMotorcycle = pathname.includes('/motorcycles');
  const isMinivan    = pathname.includes('/minivan') && !pathname.includes('/minivans');
  const isMinibus    = pathname.includes('/minibus');
  const isBus        = pathname.includes('/commercial/bus');
  const isTruck        = pathname.endsWith('/truck');
  const isTractorTruck = pathname.includes('/commercial/tractor-truck');
  const isTrailer      = pathname.endsWith('/trailer');
  const isSmallTrailer = pathname.includes('/commercial/small-trailer');
  const isBodywork     = pathname.includes('/commercial/bodywork');
  const isTowTruck              = pathname.includes('/commercial/tow-truck');
  const isCommercialPlates      = pathname.includes('/commercial/commercial-plates');
  const isResidentialForSale    = pathname.includes('/real-estate/residential/for-sale');
  const isResidentialForRent    = pathname.includes('/real-estate/residential/for-rent');
  const isDailyRental           = pathname.includes('/real-estate/residential/daily-rental');
  const isResidentialTransfer   = pathname.includes('/real-estate/residential/transfer');
  const isCommercialForSale     = pathname.includes('/real-estate/commercial/for-sale');
  const isCommercialForRent         = pathname.includes('/real-estate/commercial/for-rent');
  const isCommercialTransferSale    = pathname.includes('/real-estate/commercial/transfer-sale');
  const isCommercialTransferRent    = pathname.includes('/real-estate/commercial/transfer-rent');
  const isLandShare                 = pathname.includes('/real-estate/land/share');
  const isLandForSale               = pathname.includes('/real-estate/land/for-sale');
  const isLandForRent               = pathname.includes('/real-estate/land/for-rent');
  const isProjectsRoute             = pathname.includes('/real-estate/projects');
  const isBuildingForSale           = pathname.includes('/real-estate/building/for-sale');
  const isBuildingForRent           = pathname.includes('/real-estate/building/for-rent');
  const isTimeshareForSale          = pathname.includes('/real-estate/timeshare/for-sale');
  const isTimeshareForRent          = pathname.includes('/real-estate/timeshare/for-rent');
  const isTouristFacilitySale       = pathname.includes('/real-estate/tourist-facility/for-sale');
  const isTouristFacilityRent       = pathname.includes('/real-estate/tourist-facility/for-rent');
  const isPoolsForRent              = pathname.includes('/real-estate/pools-for-rent');
  const isRentalCars                = pathname.includes('/vehicles/rentals/cars');
  const isRentalSuv                 = pathname.includes('/vehicles/rentals/suv-pickup');
  const isRentalMinivan             = pathname.includes('/vehicles/rentals/minivan');
  const isRentalMotorcycles         = pathname.includes('/vehicles/rentals/motorcycles');
  const isRentalClassic             = pathname.includes('/vehicles/rentals/classic');
  const isRentalBus                 = pathname.includes('/vehicles/rentals/bus-minibus');
  const isRentalTowTruck            = pathname.includes('/vehicles/rentals/tow-truck');
  const isRentalTruck               = pathname.includes('/vehicles/rentals/truck') && !isRentalTowTruck;
  const isRentalRecovery            = pathname.includes('/vehicles/rentals/auto-recovery');
  const isRentalAircraft            = pathname.includes('/vehicles/rentals/aircraft');
  const isRentalCaravan             = pathname.includes('/vehicles/rentals/caravan');
  const isMarineForSale             = pathname.includes('/vehicles/marine/for-sale');
  const isMarineForRent             = pathname.includes('/vehicles/marine/for-rent');
  const isDamagedCar                = pathname.includes('/vehicles/damaged/cars');
  const isDamagedSuv                = pathname.includes('/vehicles/damaged/suv');
  const isDamagedMotorcycle         = pathname.includes('/vehicles/damaged/motorcycles');
  const isDamagedMinivan            = pathname.includes('/vehicles/damaged/minivans');
  const isDamagedCommercial         = pathname.includes('/vehicles/damaged/commercial');
  const [draft, setDraft] = useState<FilterValues>(applied);

  function set<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  type ArrKey = 'fuelTypes' | 'transmissions' | 'conditions' | 'drivetrains' | 'colors' | 'fromWhos'
             | 'motoConditions' | 'strokeType' | 'motoTransmissions' | 'coolingSystems'
             | 'fromWhosRealEstate' | 'fromWhosLand' | 'fromWhosBuilding' | 'fromWhosTimeshare' | 'fromWhosTimeshareRent'
             | 'poolFacilities' | 'fromWhosPool' | 'insuranceTypes';
  function toggle(key: ArrKey, val: string) {
    setDraft((d) => ({
      ...d,
      [key]: (d[key] as string[]).includes(val)
        ? (d[key] as string[]).filter((v) => v !== val)
        : [...(d[key] as string[]), val],
    }));
  }

  // Brand select: immediate apply, wipes vehicle-specific filters (fresh start for new brand)
  function handleMakeSelect(brand: string) {
    const newMake = applied.make === brand ? '' : brand;
    onApply({ ...EMPTY_FILTERS, categoryId: applied.categoryId, make: newMake });
  }

  // Model commit: immediate apply, preserving current draft + new model value
  function handleModelCommit(model: string) {
    const updated = { ...draft, model };
    setDraft(updated);
    onApply(updated);
  }

  const isActive = hasActiveFilters(draft);
  const apply    = () => onApply(draft);
  const clear    = () => onApply(EMPTY_FILTERS);

  // ── Category view computation ─────────────────────────────────────────────

  type CatView =
    | { kind: 'full-tree' }
    | { kind: 'scoped-tree'; root: Category }
    | { kind: 'brand-list';     catName: string; brands: readonly string[] }
    | { kind: 'brand-selected'; catName: string; brands: readonly string[]; make: string };

  let catView: CatView;

  if (draft.make && !draft.categoryId) {
    // make present but no categoryId — comes from homepage/header search like ?make=Audi.
    catView = { kind: 'brand-selected', catName: 'Otomobil', brands: CAR_BRANDS, make: draft.make };
  } else if (!draft.categoryId) {
    catView = { kind: 'full-tree' };
  } else {
    const activeCategory = findCategoryById(categories, draft.categoryId);
    const isOtomobil =
      activeCategory?.slug?.toLowerCase().includes('otomobil') ||
      activeCategory?.name?.toLowerCase() === 'otomobil'       ||
      isBrandCategory(activeCategory);

    if (isOtomobil) {
      const catName = activeCategory?.name ?? 'Otomobil';
      const brands  = brandsFor(activeCategory);
      catView = draft.make
        ? { kind: 'brand-selected', catName, brands, make: draft.make }
        : { kind: 'brand-list', catName, brands };
    } else if (activeCategory) {
      const root = findRootCategory(categories, draft.categoryId);
      catView = root ? { kind: 'scoped-tree', root } : { kind: 'full-tree' };
    } else {
      catView = { kind: 'scoped-tree', root: { id: '', name: '', slug: '' } };
    }
  }

  // ── Pathname-based override (reliable regardless of async category resolution) ─
  // When the URL is a known brand-category path, force the correct brand list even
  // if the category tree hasn't resolved yet.
  // Rental sub-routes must be checked BEFORE the generic vehicle checks below,
  // because e.g. /rentals/motorcycles contains '/motorcycles' and would be
  // incorrectly matched by the generic '/motorcycles' branch.
  if (pathname.includes('/vehicles/rentals/cars')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'سيارات سياحية - للإيجار', brands: RENTAL_CAR_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'سيارات سياحية - للإيجار', brands: RENTAL_CAR_BRANDS };
  } else if (pathname.includes('/vehicles/rentals/suv-pickup')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'دفع رباعي، جيب وبيكاب - للإيجار', brands: RENTAL_SUV_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'دفع رباعي، جيب وبيكاب - للإيجار', brands: RENTAL_SUV_BRANDS };
  } else if (pathname.includes('/vehicles/rentals/minivan')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'ميني فان وفانات تجارية - للإيجار', brands: RENTAL_MINIVAN_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'ميني فان وفانات تجارية - للإيجار', brands: RENTAL_MINIVAN_BRANDS };
  } else if (pathname.includes('/vehicles/rentals/motorcycles')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'دراجات نارية و ATV - للإيجار', brands: RENTAL_MOTORCYCLE_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'دراجات نارية و ATV - للإيجار', brands: RENTAL_MOTORCYCLE_TYPES };
  } else if (pathname.includes('/vehicles/rentals/classic')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'سيارات كلاسيكية - للإيجار', brands: RENTAL_CLASSIC_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'سيارات كلاسيكية - للإيجار', brands: RENTAL_CLASSIC_BRANDS };
  } else if (pathname.includes('/vehicles/rentals/bus-minibus')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'باصات وميكروباص - للإيجار', brands: RENTAL_BUS_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'باصات وميكروباص - للإيجار', brands: RENTAL_BUS_BRANDS };
  } else if (pathname.includes('/vehicles/rentals/tow-truck')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'سيارات سطحة وناقلات - للإيجار', brands: RENTAL_TOW_TRUCK_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'سيارات سطحة وناقلات - للإيجار', brands: RENTAL_TOW_TRUCK_BRANDS };
  } else if (pathname.includes('/vehicles/rentals/truck')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'شاحنات وسيارات إنقاذ - للإيجار', brands: RENTAL_TRUCK_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'شاحنات وسيارات إنقاذ - للإيجار', brands: RENTAL_TRUCK_BRANDS };
  } else if (pathname.includes('/vehicles/rentals/auto-recovery')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'رافعات وسيارات إنقاذ - للإيجار', brands: RENTAL_RECOVERY_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'رافعات وسيارات إنقاذ - للإيجار', brands: RENTAL_RECOVERY_TYPES };
  } else if (pathname.includes('/vehicles/rentals/aircraft')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'طائرات - للإيجار', brands: RENTAL_AIRCRAFT_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'طائرات - للإيجار', brands: RENTAL_AIRCRAFT_TYPES };
  } else if (pathname.includes('/vehicles/rentals/caravan')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'كرفانات وبيوت متنقلة - للإيجار', brands: RENTAL_CARAVAN_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'كرفانات وبيوت متنقلة - للإيجار', brands: RENTAL_CARAVAN_TYPES };
  } else if (pathname.includes('/vehicles/marine/for-sale')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'مركبات بحرية - للبيع', brands: MARINE_SALE_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'مركبات بحرية - للبيع', brands: MARINE_SALE_TYPES };
  } else if (pathname.includes('/vehicles/marine/for-rent')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'مركبات بحرية - للإيجار', brands: MARINE_RENT_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'مركبات بحرية - للإيجار', brands: MARINE_RENT_TYPES };
  } else if (pathname.includes('/vehicles/damaged/cars')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'سيارات متضررة', brands: DAMAGED_CAR_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'سيارات متضررة', brands: DAMAGED_CAR_BRANDS };
  } else if (pathname.includes('/vehicles/damaged/suv')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'دفع رباعي / SUV / بيك أب متضررة', brands: DAMAGED_SUV_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'دفع رباعي / SUV / بيك أب متضررة', brands: DAMAGED_SUV_BRANDS };
  } else if (pathname.includes('/vehicles/damaged/motorcycles')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'دراجات نارية متضررة', brands: DAMAGED_MOTORCYCLE_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'دراجات نارية متضررة', brands: DAMAGED_MOTORCYCLE_BRANDS };
  } else if (pathname.includes('/vehicles/damaged/minivans')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'ميني فان وفان مغلق متضرر', brands: DAMAGED_MINIVAN_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'ميني فان وفان مغلق متضرر', brands: DAMAGED_MINIVAN_BRANDS };
  } else if (pathname.includes('/vehicles/damaged/commercial')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'مركبات تجارية متضررة', brands: DAMAGED_COMMERCIAL_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'مركبات تجارية متضررة', brands: DAMAGED_COMMERCIAL_TYPES };
  } else if (pathname.includes('/vehicles/rentals/electric')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'مركبات كهربائية - للإيجار', brands: RENTAL_ELECTRIC_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'مركبات كهربائية - للإيجار', brands: RENTAL_ELECTRIC_TYPES };
  } else if (pathname.includes('/electric')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'سيارات كهربائية', brands: ELECTRIC_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'سيارات كهربائية', brands: ELECTRIC_BRANDS };
  } else if (pathname.includes('/motorcycles')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'دراجات نارية', brands: MOTORCYCLE_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'دراجات نارية',  brands: MOTORCYCLE_BRANDS };
  } else if (pathname.includes('/minivan')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'ميني فان وفان', brands: MINIVAN_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'ميني فان وفان',  brands: MINIVAN_BRANDS };
  } else if (pathname.includes('/minibus')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'ميكروباص وحافلة متوسطة', brands: MINIBUS_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'ميكروباص وحافلة متوسطة', brands: MINIBUS_BRANDS };
  } else if (pathname.includes('/commercial/bus')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'حافلة (باص)', brands: BUS_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'حافلة (باص)',  brands: BUS_BRANDS };
  } else if (pathname.endsWith('/truck')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'شاحنة وشاحنة خفيفة', brands: TRUCK_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'شاحنة وشاحنة خفيفة', brands: TRUCK_BRANDS };
  } else if (pathname.includes('/commercial/tractor-truck')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'رأس تريلا (قاطرة)', brands: TRACTOR_TRUCK_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'رأس تريلا (قاطرة)',  brands: TRACTOR_TRUCK_BRANDS };
  } else if (pathname.endsWith('/trailer')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'مقطورة (دورسيه)', brands: TRAILER_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'مقطورة (دورسيه)',  brands: TRAILER_TYPES };
  } else if (pathname.includes('/commercial/small-trailer')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'عربة مقطورة', brands: SMALL_TRAILER_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'عربة مقطورة',  brands: SMALL_TRAILER_TYPES };
  } else if (pathname.includes('/commercial/bodywork')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'هياكل وتجهيزات خارجية', brands: BODYWORK_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'هياكل وتجهيزات خارجية', brands: BODYWORK_TYPES };
  } else if (pathname.includes('/commercial/tow-truck')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'سيارة إنقاذ وسحب', brands: TOW_TRUCK_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'سيارة إنقاذ وسحب',  brands: TOW_TRUCK_TYPES };
  } else if (pathname.includes('/commercial/commercial-plates')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'خطوط ولوحات تجارية', brands: COMMERCIAL_PLATES_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'خطوط ولوحات تجارية',  brands: COMMERCIAL_PLATES_TYPES };
  } else if (pathname.includes('/real-estate/residential/for-sale')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'عقارات سكنية - للبيع', brands: RESIDENTIAL_FOR_SALE_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'عقارات سكنية - للبيع',  brands: RESIDENTIAL_FOR_SALE_TYPES };
  } else if (pathname.includes('/real-estate/residential/for-rent')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'عقارات سكنية - للإيجار', brands: RESIDENTIAL_FOR_RENT_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'عقارات سكنية - للإيجار',  brands: RESIDENTIAL_FOR_RENT_TYPES };
  } else if (pathname.includes('/real-estate/residential/daily-rental')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'إيجار سياحي يومي', brands: RESIDENTIAL_DAILY_RENTAL_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'إيجار سياحي يومي',  brands: RESIDENTIAL_DAILY_RENTAL_TYPES };
  } else if (pathname.includes('/real-estate/residential/transfer')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'عقار سكني للفرغ / التنازل', brands: RESIDENTIAL_TRANSFER_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'عقار سكني للفرغ / التنازل',  brands: RESIDENTIAL_TRANSFER_TYPES };
  } else if (pathname.includes('/real-estate/commercial/for-sale')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'عقارات تجارية - للبيع', brands: COMMERCIAL_FOR_SALE_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'عقارات تجارية - للبيع',  brands: COMMERCIAL_FOR_SALE_TYPES };
  } else if (pathname.includes('/real-estate/commercial/for-rent')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'عقارات تجارية - للإيجار', brands: COMMERCIAL_FOR_RENT_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'عقارات تجارية - للإيجار',  brands: COMMERCIAL_FOR_RENT_TYPES };
  } else if (pathname.includes('/real-estate/commercial/transfer-sale')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'عقار تجاري للفرغ / التنازل', brands: COMMERCIAL_TRANSFER_SALE_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'عقار تجاري للفرغ / التنازل',  brands: COMMERCIAL_TRANSFER_SALE_TYPES };
  } else if (pathname.includes('/real-estate/commercial/transfer-rent')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'عقار تجاري للاستثمار', brands: COMMERCIAL_TRANSFER_RENT_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'عقار تجاري للاستثمار',  brands: COMMERCIAL_TRANSFER_RENT_TYPES };
  } else if (pathname.includes('/real-estate/timeshare/for-rent')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'ملكية مشتركة - للإيجار', brands: TIMESHARE_RENT_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'ملكية مشتركة - للإيجار', brands: TIMESHARE_RENT_TYPES };
  } else if (pathname.includes('/real-estate/timeshare/for-sale')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'ملكية مشتركة - للبيع', brands: TIMESHARE_SALE_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: 'ملكية مشتركة - للبيع', brands: TIMESHARE_SALE_BRANDS };
  } else if (pathname.includes('/real-estate/pools-for-rent')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'مسابح للإيجار', brands: POOL_RENT_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'مسابح للإيجار', brands: POOL_RENT_TYPES };
  } else if (pathname.includes('/real-estate/tourist-facility/for-rent')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'منشآت سياحية - للإيجار', brands: TOURIST_FACILITY_RENT_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'منشآت سياحية - للإيجار', brands: TOURIST_FACILITY_RENT_TYPES };
  } else if (pathname.includes('/real-estate/tourist-facility/for-sale')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'منشآت سياحية - للبيع', brands: TOURIST_FACILITY_SALE_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'منشآت سياحية - للبيع', brands: TOURIST_FACILITY_SALE_TYPES };
  } else if (pathname.includes('/real-estate/building/for-sale') || pathname.includes('/real-estate/building/for-rent')) {
    catView = { kind: 'scoped-tree', root: { id: '', name: '', slug: '' } };
  } else if (pathname.includes('/real-estate/projects')) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: 'مشاريع سكنية', brands: PROJECT_PROPERTY_TYPES, make: draft.make }
      : { kind: 'brand-list',     catName: 'مشاريع سكنية', brands: PROJECT_PROPERTY_TYPES };
  } else if (pathname.includes('/real-estate/land/share') || pathname.includes('/real-estate/land/for-sale') || pathname.includes('/real-estate/land/for-rent')) {
    // No type list for these routes — scoped-tree with empty root renders only the back button
    catView = { kind: 'scoped-tree', root: { id: '', name: '', slug: '' } };
  } else if (/\/category\/vehicles\/(cars|damaged|classic|disabled|suv-pickup)/.test(pathname)) {
    catView = draft.make
      ? { kind: 'brand-selected', catName: catView.kind === 'brand-selected' ? catView.catName : 'سيارات', brands: CAR_BRANDS, make: draft.make }
      : { kind: 'brand-list',     catName: catView.kind === 'brand-list'     ? catView.catName : 'سيارات', brands: CAR_BRANDS };
  }

  const backToAll = (
    <button
      type="button"
      onClick={() => onApply(EMPTY_FILTERS)}
      className="flex items-center gap-1.5 mb-3 w-full text-[13px] text-gray-500 hover:text-orange-500 transition-colors font-medium"
    >
      <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
      العودة لجميع الفئات
    </button>
  );

  return (
    <div className="h-full flex flex-col">

      {/* ── Scrollable content area ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Category section */}
        <div className="px-3 pt-4 pb-2">
          <SectionLabel>الفئة</SectionLabel>

          {catView.kind === 'full-tree' && (
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => { set('categoryId', ''); set('make', ''); set('model', ''); }}
                  className="w-full text-left text-[13px] px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 font-semibold"
                >
                  جميع الإعلانات
                </button>
              </li>
              {categories.map((cat) => (
                <CategoryNode
                  key={cat.id}
                  cat={cat}
                  depth={0}
                  selectedId={draft.categoryId}
                  onSelect={(id) => { set('categoryId', id); set('make', ''); set('model', ''); }}
                />
              ))}
            </ul>
          )}

          {catView.kind === 'scoped-tree' && (
            <>
              {backToAll}
              {catView.root.id && (
                <ul className="space-y-0.5">
                  <CategoryNode
                    cat={catView.root}
                    depth={0}
                    selectedId={draft.categoryId}
                    onSelect={(id) => { set('categoryId', id); set('make', ''); set('model', ''); }}
                  />
                </ul>
              )}
            </>
          )}

          {catView.kind === 'brand-list' && (
            <div className="mb-6">
              {backToAll}
              <h3 className="font-bold text-lg mb-4 text-orange-500">{catView.catName}</h3>
              <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {catView.brands.map((brand) => (
                  <li
                    key={brand}
                    className={cn(
                      'cursor-pointer text-[13px] px-2 py-1 rounded-lg transition-colors hover:text-orange-500',
                      applied.make === brand
                        ? 'text-orange-600 font-semibold bg-orange-50'
                        : 'text-gray-700',
                    )}
                    onClick={() => handleMakeSelect(brand)}
                  >
                    {brand}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {catView.kind === 'brand-selected' && (
            <div className="mb-6">
              {backToAll}
              <h3 className="font-bold text-lg mb-4 text-orange-500">{catView.catName}</h3>
              <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {catView.brands.map((brand) => (
                  <li
                    key={brand}
                    className={cn(
                      'cursor-pointer text-[13px] px-2 py-1 rounded-lg transition-colors hover:text-orange-500',
                      applied.make === brand
                        ? 'text-orange-600 font-semibold bg-orange-50'
                        : 'text-gray-700',
                    )}
                    onClick={() => handleMakeSelect(brand)}
                  >
                    {brand}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Accordion filter sections */}
        <div className="px-3 pb-28">

          {/* ── Model autocomplete — only visible when a make is selected ── */}
          {catView.kind === 'brand-selected' && (
            <div className="border-t border-gray-100">
              <div className="py-2.5">
                <p className="text-sm font-bold text-gray-800 mb-2">
                  Model
                  {draft.model && (
                    <span className="ml-2 text-[11px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                      {draft.model}
                    </span>
                  )}
                </p>
                <ModelCombobox
                  make={draft.make}
                  value={draft.model}
                  onChange={(v) => set('model', v)}
                  onCommit={handleModelCommit}
                />
              </div>
            </div>
          )}

          <Accordion title="العنوان" defaultOpen>
            <div className="space-y-2">
              <select
                value={draft.city}
                onChange={(e) => set('city', e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
              >
                <option value="">جميع المحافظات</option>
                {SYRIAN_GOVERNORATES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="text"
                value={draft.district}
                onChange={(e) => set('district', e.target.value)}
                placeholder="المنطقة / الحي"
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white placeholder:text-gray-300"
              />
            </div>
          </Accordion>

          <Accordion title="السعر" defaultOpen badge={draft.minPrice || draft.maxPrice ? 1 : undefined}>
            <div className="space-y-2">
              <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg">
                {(['SYP', 'USD'] as const).map((cur) => (
                  <button key={cur} type="button" onClick={() => set('currency', cur)}
                    className={cn(
                      'flex-1 text-xs font-bold py-1.5 rounded-md transition-all',
                      draft.currency === cur
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700',
                    )}
                  >
                    {cur}
                  </button>
                ))}
              </div>
              <RangeInputs
                minVal={draft.minPrice} maxVal={draft.maxPrice}
                onMin={(v) => set('minPrice', v)} onMax={(v) => set('maxPrice', v)}
                ph={['Min', 'Max']}
              />
            </div>
          </Accordion>

          {!isTrailer && !isSmallTrailer && !isBodywork && !isTowTruck && !isCommercialPlates && !isResidentialForSale && !isResidentialForRent && !isDailyRental && !isResidentialTransfer && !isCommercialForSale && !isCommercialForRent && !isCommercialTransferSale && !isCommercialTransferRent && !isLandShare && !isLandForSale && !isLandForRent && !isProjectsRoute && !isBuildingForSale && !isBuildingForRent && !isTimeshareForSale && !isTimeshareForRent && !isTouristFacilitySale && !isTouristFacilityRent && !isPoolsForRent && !isRentalCars && !isRentalSuv && !isRentalMinivan && !isRentalMotorcycles && !isRentalClassic && !isRentalBus && !isRentalTruck && !isRentalRecovery && !isRentalTowTruck && !isRentalAircraft && !isRentalCaravan && !isRentalElectric && !isMarineForSale && !isMarineForRent && !isDamagedCar && !isDamagedSuv && !isDamagedMotorcycle && !isDamagedMinivan && !isDamagedCommercial && (
            <Accordion title="السنة" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
              <RangeInputs
                minVal={draft.minYear} maxVal={draft.maxYear}
                onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                ph={['أدنى سنة', 'أقصى سنة']}
              />
            </Accordion>
          )}

          {!isTrailer && !isSmallTrailer && !isBodywork && !isTowTruck && !isCommercialPlates && !isResidentialForSale && !isResidentialForRent && !isDailyRental && !isResidentialTransfer && !isCommercialForSale && !isCommercialForRent && !isCommercialTransferSale && !isCommercialTransferRent && !isLandShare && !isLandForSale && !isLandForRent && !isProjectsRoute && !isBuildingForSale && !isBuildingForRent && !isTimeshareForSale && !isTimeshareForRent && !isTouristFacilitySale && !isTouristFacilityRent && !isPoolsForRent && !isRentalCars && !isRentalSuv && !isRentalMinivan && !isRentalMotorcycles && !isRentalClassic && !isRentalBus && !isRentalTruck && !isRentalRecovery && !isRentalTowTruck && !isRentalAircraft && !isRentalCaravan && !isRentalElectric && !isMarineForSale && !isMarineForRent && !isDamagedCar && !isDamagedSuv && !isDamagedMotorcycle && !isDamagedMinivan && !isDamagedCommercial && (
            <Accordion title="المسافة (كم)" defaultOpen={false} badge={draft.minMileage || draft.maxMileage ? 1 : undefined}>
              <RangeInputs
                minVal={draft.minMileage} maxVal={draft.maxMileage}
                onMin={(v) => set('minMileage', v)} onMax={(v) => set('maxMileage', v)}
                ph={['أدنى كم', 'أقصى كم']}
              />
            </Accordion>
          )}

          {/* ── EV-only: battery range ── */}
          {isElectric && (
            <Accordion title="مدى السير (كم)" defaultOpen badge={draft.minRange || draft.maxRange ? 1 : undefined}>
              <RangeInputs
                minVal={draft.minRange} maxVal={draft.maxRange}
                onMin={(v) => set('minRange', v)} onMax={(v) => set('maxRange', v)}
                ph={['أدنى حد', 'أقصى حد']}
              />
            </Accordion>
          )}

          {/* ── Motorcycle-specific filters ── */}
          {isMotorcycle && (
            <>
              <Accordion title="حالة المركبة" badge={draft.motoConditions.length || undefined}>
                {MOTO_CONDITIONS.map((c) => (
                  <CheckItem key={c} label={c}
                    checked={draft.motoConditions.includes(c)}
                    onChange={() => toggle('motoConditions', c)}
                  />
                ))}
              </Accordion>

              <Accordion title="الفئة / النوع" defaultOpen={false} badge={draft.motoType ? 1 : undefined}>
                <select
                  value={draft.motoType}
                  onChange={(e) => set('motoType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MOTO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="سعة المحرك (cc)" defaultOpen={false} badge={draft.engineCapacity ? 1 : undefined}>
                <select
                  value={draft.engineCapacity}
                  onChange={(e) => set('engineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {ENGINE_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="قوة المحرك (حصان)" defaultOpen={false} badge={draft.enginePower ? 1 : undefined}>
                <select
                  value={draft.enginePower}
                  onChange={(e) => set('enginePower', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {ENGINE_POWERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع المحرك / الأشواط" defaultOpen={false} badge={draft.strokeType.length || undefined}>
                {STROKE_TYPES.map((s) => (
                  <CheckItem key={s} label={s}
                    checked={draft.strokeType.includes(s)}
                    onChange={() => toggle('strokeType', s)}
                  />
                ))}
              </Accordion>

              <Accordion title="عدد الأسطوانات" defaultOpen={false} badge={draft.cylinderCount ? 1 : undefined}>
                <select
                  value={draft.cylinderCount}
                  onChange={(e) => set('cylinderCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {CYLINDER_COUNTS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="ناقل الحركة" badge={draft.motoTransmissions.length || undefined}>
                {MOTO_TRANSMISSIONS.map((t) => (
                  <CheckItem key={t} label={t}
                    checked={draft.motoTransmissions.includes(t)}
                    onChange={() => toggle('motoTransmissions', t)}
                  />
                ))}
              </Accordion>

              <Accordion title="نظام التبريد" defaultOpen={false} badge={draft.coolingSystems.length || undefined}>
                {COOLING_SYSTEMS.map((c) => (
                  <CheckItem key={c} label={c}
                    checked={draft.coolingSystems.includes(c)}
                    onChange={() => toggle('coolingSystems', c)}
                  />
                ))}
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {MOTO_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>

              <Accordion title="بلد المنشأ" defaultOpen={false} badge={draft.origin ? 1 : undefined}>
                <select
                  value={draft.origin}
                  onChange={(e) => set('origin', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MOTO_ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {/* ── Minivan-specific filters ── */}
          {isMinivan && (
            <>
              <Accordion title="نوع الهيكل" defaultOpen={false} badge={draft.minivanBodyType ? 1 : undefined}>
                <select
                  value={draft.minivanBodyType}
                  onChange={(e) => set('minivanBodyType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIVAN_BODY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="الشاسيه" defaultOpen={false} badge={draft.minivanChassis ? 1 : undefined}>
                <select
                  value={draft.minivanChassis}
                  onChange={(e) => set('minivanChassis', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIVAN_CHASSIS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="قوة المحرك (حصان)" defaultOpen={false} badge={draft.minivanEnginePower ? 1 : undefined}>
                <select
                  value={draft.minivanEnginePower}
                  onChange={(e) => set('minivanEnginePower', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIVAN_ENGINE_POWERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="سعة المحرك" defaultOpen={false} badge={draft.minivanEngineCapacity ? 1 : undefined}>
                <select
                  value={draft.minivanEngineCapacity}
                  onChange={(e) => set('minivanEngineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIVAN_ENGINE_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد المقاعد" defaultOpen={false} badge={draft.seatCount ? 1 : undefined}>
                <select
                  value={draft.seatCount}
                  onChange={(e) => set('seatCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {SEAT_COUNTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" badge={draft.fuelTypes.length || undefined}>
                {FUEL_TYPE_OPTIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.fuelTypes.includes(o.value)}
                    onChange={() => toggle('fuelTypes', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="ناقل الحركة" badge={draft.transmissions.length || undefined}>
                {MINIVAN_TRANSMISSIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.transmissions.includes(o.value)}
                    onChange={() => toggle('transmissions', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="الدفع" defaultOpen={false} badge={draft.drivetrains.length || undefined}>
                {MINIVAN_DRIVETRAINS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.drivetrains.includes(o.value)}
                    onChange={() => toggle('drivetrains', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>
            </>
          )}

          {/* ── Minibus-specific filters ── */}
          {isMinibus && (
            <>
              <Accordion title="سعة المحرك" defaultOpen={false} badge={draft.minibusEngineCapacity ? 1 : undefined}>
                <select
                  value={draft.minibusEngineCapacity}
                  onChange={(e) => set('minibusEngineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIBUS_ENGINE_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="قوة المحرك (حصان)" defaultOpen={false} badge={draft.minibusEnginePower ? 1 : undefined}>
                <select
                  value={draft.minibusEnginePower}
                  onChange={(e) => set('minibusEnginePower', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIBUS_ENGINE_POWERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد المقاعد" defaultOpen={false} badge={draft.minibusSeatCount ? 1 : undefined}>
                <select
                  value={draft.minibusSeatCount}
                  onChange={(e) => set('minibusSeatCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIBUS_SEAT_COUNTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع السقف" defaultOpen={false} badge={draft.roofType ? 1 : undefined}>
                <select
                  value={draft.roofType}
                  onChange={(e) => set('roofType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {ROOF_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Accordion>

              <Accordion title="الشاسيه" defaultOpen={false} badge={draft.minibusChassis ? 1 : undefined}>
                <select
                  value={draft.minibusChassis}
                  onChange={(e) => set('minibusChassis', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIBUS_CHASSIS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" badge={draft.fuelTypes.length || undefined}>
                {FUEL_TYPE_OPTIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.fuelTypes.includes(o.value)}
                    onChange={() => toggle('fuelTypes', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="ناقل الحركة" badge={draft.transmissions.length || undefined}>
                {MINIBUS_TRANSMISSIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.transmissions.includes(o.value)}
                    onChange={() => toggle('transmissions', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="الدفع" defaultOpen={false} badge={draft.drivetrains.length || undefined}>
                {MINIBUS_DRIVETRAINS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.drivetrains.includes(o.value)}
                    onChange={() => toggle('drivetrains', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>
            </>
          )}

          {/* ── Bus-specific filters ── */}
          {isBus && (
            <>
              <Accordion title="حالة المركبة" badge={draft.conditions.length || undefined}>
                <CheckItem label="مستعمل" checked={draft.conditions.includes('USED')} onChange={() => toggle('conditions', 'USED')} />
                <CheckItem label="جديد"   checked={draft.conditions.includes('NEW')}  onChange={() => toggle('conditions', 'NEW')} />
              </Accordion>

              <Accordion title="ترتيب المقاعد" defaultOpen={false} badge={draft.seatLayout ? 1 : undefined}>
                <select
                  value={draft.seatLayout}
                  onChange={(e) => set('seatLayout', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {SEAT_LAYOUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>

              <Accordion title="شاشة خلف المقعد (بوصة)" defaultOpen={false} badge={draft.seatbackScreen ? 1 : undefined}>
                <select
                  value={draft.seatbackScreen}
                  onChange={(e) => set('seatbackScreen', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {SEATBACK_SCREENS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الغيارات" defaultOpen={false} badge={draft.gearCount ? 1 : undefined}>
                <select
                  value={draft.gearCount}
                  onChange={(e) => set('gearCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {GEAR_COUNTS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Accordion>

              <Accordion title="سعة الركاب" defaultOpen={false} badge={draft.minPassengers || draft.maxPassengers ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minPassengers} maxVal={draft.maxPassengers}
                  onMin={(v) => set('minPassengers', v)} onMax={(v) => set('maxPassengers', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سعة خزان الوقود (لتر)" defaultOpen={false} badge={draft.minFuelTank || draft.maxFuelTank ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minFuelTank} maxVal={draft.maxFuelTank}
                  onMin={(v) => set('minFuelTank', v)} onMax={(v) => set('maxFuelTank', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="ناقل الحركة" badge={draft.transmissions.length || undefined}>
                {BUS_TRANSMISSIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.transmissions.includes(o.value)}
                    onChange={() => toggle('transmissions', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>
            </>
          )}

          {/* ── Tractor-truck-specific filters ── */}
          {isTractorTruck && (
            <>
              <Accordion title="حالة المركبة" badge={draft.conditions.length || undefined}>
                <CheckItem label="مستعمل" checked={draft.conditions.includes('USED')} onChange={() => toggle('conditions', 'USED')} />
                <CheckItem label="جديد"   checked={draft.conditions.includes('NEW')}  onChange={() => toggle('conditions', 'NEW')} />
              </Accordion>

              <Accordion title="سعة المحرك" defaultOpen={false} badge={draft.tractorEngineCapacity ? 1 : undefined}>
                <select
                  value={draft.tractorEngineCapacity}
                  onChange={(e) => set('tractorEngineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIBUS_ENGINE_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="قوة المحرك (حصان)" defaultOpen={false} badge={draft.tractorEnginePower ? 1 : undefined}>
                <select
                  value={draft.tractorEnginePower}
                  onChange={(e) => set('tractorEnginePower', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIBUS_ENGINE_POWERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="سرير / منامة" defaultOpen={false} badge={draft.tractorBed ? 1 : undefined}>
                <select
                  value={draft.tractorBed}
                  onChange={(e) => set('tractorBed', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TRACTOR_BEDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Accordion>

              <Accordion title="مقطورة / دورسيه" defaultOpen={false} badge={draft.tractorTrailerIncluded ? 1 : undefined}>
                <select
                  value={draft.tractorTrailerIncluded}
                  onChange={(e) => set('tractorTrailerIncluded', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TRACTOR_TRAILER_INCLUDED.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" badge={draft.tractorFuelType ? 1 : undefined}>
                {TRACTOR_FUEL_TYPES.map((f) => (
                  <CheckItem key={f} label={f}
                    checked={draft.tractorFuelType === f}
                    onChange={() => set('tractorFuelType', draft.tractorFuelType === f ? '' : f)}
                  />
                ))}
              </Accordion>

              <Accordion title="ناقل الحركة" badge={draft.transmissions.length || undefined}>
                {TRACTOR_TRANSMISSIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.transmissions.includes(o.value)}
                    onChange={() => toggle('transmissions', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>
            </>
          )}

          {/* ── Truck-specific filters ── */}
          {isTruck && (
            <>
              <Accordion title="حالة المركبة" badge={draft.conditions.length || undefined}>
                <CheckItem label="مستعمل" checked={draft.conditions.includes('USED')} onChange={() => toggle('conditions', 'USED')} />
                <CheckItem label="جديد"   checked={draft.conditions.includes('NEW')}  onChange={() => toggle('conditions', 'NEW')} />
              </Accordion>

              <Accordion title="سعة المحرك" defaultOpen={false} badge={draft.truckEngineCapacity ? 1 : undefined}>
                <select
                  value={draft.truckEngineCapacity}
                  onChange={(e) => set('truckEngineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIBUS_ENGINE_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="قوة المحرك (حصان)" defaultOpen={false} badge={draft.truckEnginePower ? 1 : undefined}>
                <select
                  value={draft.truckEnginePower}
                  onChange={(e) => set('truckEnginePower', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MINIBUS_ENGINE_POWERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="تجهيزات الهيكل / الصندوق" defaultOpen={false} badge={draft.superstructureType ? 1 : undefined}>
                <select
                  value={draft.superstructureType}
                  onChange={(e) => set('superstructureType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {SUPERSTRUCTURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="سعة التحميل (كجم)" defaultOpen={false} badge={draft.payloadCapacity ? 1 : undefined}>
                <select
                  value={draft.payloadCapacity}
                  onChange={(e) => set('payloadCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {PAYLOAD_CAPACITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="الدفع / المحاور" defaultOpen={false} badge={draft.truckDrivetrain ? 1 : undefined}>
                <select
                  value={draft.truckDrivetrain}
                  onChange={(e) => set('truckDrivetrain', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TRUCK_DRIVETRAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" badge={draft.fuelTypes.length || undefined}>
                {FUEL_TYPE_OPTIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.fuelTypes.includes(o.value)}
                    onChange={() => toggle('fuelTypes', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="ناقل الحركة" badge={draft.transmissions.length || undefined}>
                {TRUCK_TRANSMISSIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.transmissions.includes(o.value)}
                    onChange={() => toggle('transmissions', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>
            </>
          )}

          {/* ── Rental cars–specific filters ── */}
          {isRentalCars && (
            <>
              <Accordion title="السعر الأسبوعي" defaultOpen={false} badge={draft.minWeeklyPrice || draft.maxWeeklyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minWeeklyPrice} maxVal={draft.maxWeeklyPrice}
                  onMin={(v) => set('minWeeklyPrice', v)} onMax={(v) => set('maxWeeklyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع (الموديل)" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minYear} maxVal={draft.maxYear}
                  onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                  ph={['أدنى سنة', 'أقصى سنة']}
                />
              </Accordion>

              <Accordion title="سعة المحرك" defaultOpen={false} badge={draft.rentalEngineCapacity ? 1 : undefined}>
                <select
                  value={draft.rentalEngineCapacity}
                  onChange={(e) => set('rentalEngineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_ENGINE_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="ناقل الحركة" defaultOpen={false} badge={draft.rentalTransmission ? 1 : undefined}>
                <select
                  value={draft.rentalTransmission}
                  onChange={(e) => set('rentalTransmission', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" defaultOpen={false} badge={draft.rentalFuelType ? 1 : undefined}>
                <select
                  value={draft.rentalFuelType}
                  onChange={(e) => set('rentalFuelType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الهيكل" defaultOpen={false} badge={draft.bodyType ? 1 : undefined}>
                <select
                  value={draft.bodyType}
                  onChange={(e) => set('bodyType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BODY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>

              <Accordion title="مع سائق" defaultOpen={false} badge={draft.withChauffeur ? 1 : undefined}>
                <select
                  value={draft.withChauffeur}
                  onChange={(e) => set('withChauffeur', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {CHAUFFEUR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="طريقة الدفع" defaultOpen={false} badge={draft.rentalPaymentMethod ? 1 : undefined}>
                <select
                  value={draft.rentalPaymentMethod}
                  onChange={(e) => set('rentalPaymentMethod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Accordion>

              <Accordion title="التأمين" defaultOpen={false} badge={draft.insuranceTypes.length || undefined}>
                {RENTAL_INSURANCE_TYPES.map((t) => (
                  <CheckItem key={t} label={t}
                    checked={draft.insuranceTypes.includes(t)}
                    onChange={() => toggle('insuranceTypes', t)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Rental SUV & Pick-up–specific filters ── */}
          {isRentalSuv && (
            <>
              <Accordion title="السعر الأسبوعي" defaultOpen={false} badge={draft.minWeeklyPrice || draft.maxWeeklyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minWeeklyPrice} maxVal={draft.maxWeeklyPrice}
                  onMin={(v) => set('minWeeklyPrice', v)} onMax={(v) => set('maxWeeklyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع (الموديل)" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minYear} maxVal={draft.maxYear}
                  onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                  ph={['أدنى سنة', 'أقصى سنة']}
                />
              </Accordion>

              <Accordion title="سعة المحرك" defaultOpen={false} badge={draft.rentalEngineCapacity ? 1 : undefined}>
                <select
                  value={draft.rentalEngineCapacity}
                  onChange={(e) => set('rentalEngineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_ENGINE_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الغيارات" defaultOpen={false} badge={draft.rentalTransmission ? 1 : undefined}>
                <select
                  value={draft.rentalTransmission}
                  onChange={(e) => set('rentalTransmission', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" defaultOpen={false} badge={draft.rentalFuelType ? 1 : undefined}>
                <select
                  value={draft.rentalFuelType}
                  onChange={(e) => set('rentalFuelType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="نظام الدفع" defaultOpen={false} badge={draft.suvTractionType ? 1 : undefined}>
                <select
                  value={draft.suvTractionType}
                  onChange={(e) => set('suvTractionType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {SUV_TRACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>

              <Accordion title="مع سائق" defaultOpen={false} badge={draft.withChauffeur ? 1 : undefined}>
                <select
                  value={draft.withChauffeur}
                  onChange={(e) => set('withChauffeur', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {CHAUFFEUR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="طريقة الدفع" defaultOpen={false} badge={draft.rentalPaymentMethod ? 1 : undefined}>
                <select
                  value={draft.rentalPaymentMethod}
                  onChange={(e) => set('rentalPaymentMethod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Accordion>

              <Accordion title="التأمين" defaultOpen={false} badge={draft.insuranceTypes.length || undefined}>
                {RENTAL_INSURANCE_TYPES.map((t) => (
                  <CheckItem key={t} label={t}
                    checked={draft.insuranceTypes.includes(t)}
                    onChange={() => toggle('insuranceTypes', t)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Rental Minivan & Panelvan–specific filters ── */}
          {isRentalMinivan && (
            <>
              <Accordion title="السعر الأسبوعي" defaultOpen={false} badge={draft.minWeeklyPrice || draft.maxWeeklyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minWeeklyPrice} maxVal={draft.maxWeeklyPrice}
                  onMin={(v) => set('minWeeklyPrice', v)} onMax={(v) => set('maxWeeklyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع (الموديل)" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minYear} maxVal={draft.maxYear}
                  onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                  ph={['أدنى سنة', 'أقصى سنة']}
                />
              </Accordion>

              <Accordion title="سعة المحرك" defaultOpen={false} badge={draft.rentalEngineCapacity ? 1 : undefined}>
                <select
                  value={draft.rentalEngineCapacity}
                  onChange={(e) => set('rentalEngineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_ENGINE_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الغيارات" defaultOpen={false} badge={draft.rentalTransmission ? 1 : undefined}>
                <select
                  value={draft.rentalTransmission}
                  onChange={(e) => set('rentalTransmission', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الهيكل / الكبين" defaultOpen={false} badge={draft.rentalMinivanBodyType ? 1 : undefined}>
                <select
                  value={draft.rentalMinivanBodyType}
                  onChange={(e) => set('rentalMinivanBodyType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_MINIVAN_BODY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" defaultOpen={false} badge={draft.rentalFuelType ? 1 : undefined}>
                <select
                  value={draft.rentalFuelType}
                  onChange={(e) => set('rentalFuelType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="نظام الدفع" defaultOpen={false} badge={draft.suvTractionType ? 1 : undefined}>
                <select
                  value={draft.suvTractionType}
                  onChange={(e) => set('suvTractionType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {SUV_TRACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>

              <Accordion title="مع سائق" defaultOpen={false} badge={draft.withChauffeur ? 1 : undefined}>
                <select
                  value={draft.withChauffeur}
                  onChange={(e) => set('withChauffeur', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {CHAUFFEUR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="طريقة الدفع" defaultOpen={false} badge={draft.rentalPaymentMethod ? 1 : undefined}>
                <select
                  value={draft.rentalPaymentMethod}
                  onChange={(e) => set('rentalPaymentMethod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Accordion>

              <Accordion title="التأمين" defaultOpen={false} badge={draft.insuranceTypes.length || undefined}>
                {RENTAL_INSURANCE_TYPES.map((t) => (
                  <CheckItem key={t} label={t}
                    checked={draft.insuranceTypes.includes(t)}
                    onChange={() => toggle('insuranceTypes', t)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Rental Motorcycles & ATV–specific filters ── */}
          {isRentalMotorcycles && (
            <>
              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع" defaultOpen badge={draft.rentalMotoYear ? 1 : undefined}>
                <select
                  value={draft.rentalMotoYear}
                  onChange={(e) => set('rentalMotoYear', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_MOTORCYCLE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Accordion>

              <Accordion title="سعة المحرك" defaultOpen={false} badge={draft.rentalEngineCapacity ? 1 : undefined}>
                <select
                  value={draft.rentalEngineCapacity}
                  onChange={(e) => set('rentalEngineCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_MOTORCYCLE_ENGINE_CAPS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الغيارات" defaultOpen={false} badge={draft.rentalTransmission ? 1 : undefined}>
                <select
                  value={draft.rentalTransmission}
                  onChange={(e) => set('rentalTransmission', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_MOTORCYCLE_TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="طريقة الدفع" defaultOpen={false} badge={draft.rentalPaymentMethod ? 1 : undefined}>
                <select
                  value={draft.rentalPaymentMethod}
                  onChange={(e) => set('rentalPaymentMethod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Accordion>

              <Accordion title="التأمين" defaultOpen={false} badge={draft.insuranceTypes.length || undefined}>
                {RENTAL_MOTORCYCLE_INSURANCE_TYPES.map((t) => (
                  <CheckItem key={t} label={t}
                    checked={draft.insuranceTypes.includes(t)}
                    onChange={() => toggle('insuranceTypes', t)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Rental Classic Cars–specific filters ── */}
          {isRentalClassic && (
            <>
              <Accordion title="السعر الأسبوعي" defaultOpen={false} badge={draft.minWeeklyPrice || draft.maxWeeklyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minWeeklyPrice} maxVal={draft.maxWeeklyPrice}
                  onMin={(v) => set('minWeeklyPrice', v)} onMax={(v) => set('maxWeeklyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع (الموديل)" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minYear} maxVal={draft.maxYear}
                  onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                  ph={['أدنى سنة', 'أقصى سنة']}
                />
              </Accordion>

              <Accordion title="نوع الهيكل / الفئة" defaultOpen={false} badge={draft.rentalClassicBodyType ? 1 : undefined}>
                <select
                  value={draft.rentalClassicBodyType}
                  onChange={(e) => set('rentalClassicBodyType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CLASSIC_BODY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الغيارات" defaultOpen={false} badge={draft.rentalTransmission ? 1 : undefined}>
                <select
                  value={draft.rentalTransmission}
                  onChange={(e) => set('rentalTransmission', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" defaultOpen={false} badge={draft.rentalFuelType ? 1 : undefined}>
                <select
                  value={draft.rentalFuelType}
                  onChange={(e) => set('rentalFuelType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CAR_FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>

              <Accordion title="مع سائق" defaultOpen={false} badge={draft.withChauffeur ? 1 : undefined}>
                <select
                  value={draft.withChauffeur}
                  onChange={(e) => set('withChauffeur', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {CHAUFFEUR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="طريقة الدفع" defaultOpen={false} badge={draft.rentalPaymentMethod ? 1 : undefined}>
                <select
                  value={draft.rentalPaymentMethod}
                  onChange={(e) => set('rentalPaymentMethod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Accordion>

              <Accordion title="التأمين" defaultOpen={false} badge={draft.insuranceTypes.length || undefined}>
                {RENTAL_INSURANCE_TYPES.map((t) => (
                  <CheckItem key={t} label={t}
                    checked={draft.insuranceTypes.includes(t)}
                    onChange={() => toggle('insuranceTypes', t)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Rental Bus & Minibus–specific filters ── */}
          {isRentalBus && (
            <>
              <Accordion title="السعر الأسبوعي" defaultOpen={false} badge={draft.minWeeklyPrice || draft.maxWeeklyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minWeeklyPrice} maxVal={draft.maxWeeklyPrice}
                  onMin={(v) => set('minWeeklyPrice', v)} onMax={(v) => set('maxWeeklyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع (الموديل)" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minYear} maxVal={draft.maxYear}
                  onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                  ph={['أدنى سنة', 'أقصى سنة']}
                />
              </Accordion>

              <Accordion title="عدد الركاب (السعة)" defaultOpen={false} badge={draft.minBusPassengers || draft.maxBusPassengers ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minBusPassengers} maxVal={draft.maxBusPassengers}
                  onMin={(v) => set('minBusPassengers', v)} onMax={(v) => set('maxBusPassengers', v)}
                  ph={['أدنى عدد', 'أقصى عدد']}
                />
              </Accordion>

              <Accordion title="نوع الغيارات" defaultOpen={false} badge={draft.rentalTransmission ? 1 : undefined}>
                <select
                  value={draft.rentalTransmission}
                  onChange={(e) => set('rentalTransmission', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_BUS_TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" defaultOpen={false} badge={draft.rentalFuelType ? 1 : undefined}>
                <select
                  value={draft.rentalFuelType}
                  onChange={(e) => set('rentalFuelType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_BUS_FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="مع سائق" defaultOpen={false} badge={draft.withChauffeur ? 1 : undefined}>
                <select
                  value={draft.withChauffeur}
                  onChange={(e) => set('withChauffeur', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {CHAUFFEUR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="طريقة الدفع" defaultOpen={false} badge={draft.rentalPaymentMethod ? 1 : undefined}>
                <select
                  value={draft.rentalPaymentMethod}
                  onChange={(e) => set('rentalPaymentMethod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Accordion>

              <Accordion title="التأمين" defaultOpen={false} badge={draft.insuranceTypes.length || undefined}>
                {RENTAL_INSURANCE_TYPES.map((t) => (
                  <CheckItem key={t} label={t}
                    checked={draft.insuranceTypes.includes(t)}
                    onChange={() => toggle('insuranceTypes', t)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Rental Truck–specific filters ── */}
          {isRentalTruck && (
            <>
              <Accordion title="السعر الأسبوعي" defaultOpen={false} badge={draft.minWeeklyPrice || draft.maxWeeklyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minWeeklyPrice} maxVal={draft.maxWeeklyPrice}
                  onMin={(v) => set('minWeeklyPrice', v)} onMax={(v) => set('maxWeeklyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع (الموديل)" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minYear} maxVal={draft.maxYear}
                  onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                  ph={['أدنى سنة', 'أقصى سنة']}
                />
              </Accordion>

              <Accordion title="سعة الحمولة (طن)" defaultOpen={false} badge={draft.minLoadCapacity || draft.maxLoadCapacity ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minLoadCapacity} maxVal={draft.maxLoadCapacity}
                  onMin={(v) => set('minLoadCapacity', v)} onMax={(v) => set('maxLoadCapacity', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="نوع الشاحنة" defaultOpen badge={draft.rentalTruckType ? 1 : undefined}>
                <select
                  value={draft.rentalTruckType}
                  onChange={(e) => set('rentalTruckType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الغيارات" defaultOpen={false} badge={draft.rentalTransmission ? 1 : undefined}>
                <select
                  value={draft.rentalTransmission}
                  onChange={(e) => set('rentalTransmission', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_GEAR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" defaultOpen={false} badge={draft.rentalFuelType ? 1 : undefined}>
                <select
                  value={draft.rentalFuelType}
                  onChange={(e) => set('rentalFuelType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="مع سائق" defaultOpen={false} badge={draft.withChauffeur ? 1 : undefined}>
                <select
                  value={draft.withChauffeur}
                  onChange={(e) => set('withChauffeur', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_CHAUFFEUR.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="طريقة الدفع" defaultOpen={false} badge={draft.rentalPaymentMethod ? 1 : undefined}>
                <select
                  value={draft.rentalPaymentMethod}
                  onChange={(e) => set('rentalPaymentMethod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Accordion>

              <Accordion title="التأمين" defaultOpen={false} badge={draft.insuranceTypes.length || undefined}>
                {RENTAL_TRUCK_INSURANCE_TYPES.map((t) => (
                  <CheckItem key={t} label={t}
                    checked={draft.insuranceTypes.includes(t)}
                    onChange={() => toggle('insuranceTypes', t)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Rental Tow Truck–specific filters ── */}
          {isRentalTowTruck && (
            <>
              <Accordion title="سنة الصنع (الموديل)" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minYear} maxVal={draft.maxYear}
                  onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                  ph={['أدنى سنة', 'أقصى سنة']}
                />
              </Accordion>

              <Accordion title="نوع الغيارات" defaultOpen={false} badge={draft.rentalTransmission ? 1 : undefined}>
                <select
                  value={draft.rentalTransmission}
                  onChange={(e) => set('rentalTransmission', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_GEAR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" defaultOpen={false} badge={draft.rentalFuelType ? 1 : undefined}>
                <select
                  value={draft.rentalFuelType}
                  onChange={(e) => set('rentalFuelType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="مع سائق" defaultOpen={false} badge={draft.withChauffeur ? 1 : undefined}>
                <select
                  value={draft.withChauffeur}
                  onChange={(e) => set('withChauffeur', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_TRUCK_CHAUFFEUR.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {/* ── Rental Aircraft–specific filters ── */}
          {isRentalAircraft && (
            <>
              <Accordion title="السعر الأسبوعي" defaultOpen={false} badge={draft.minWeeklyPrice || draft.maxWeeklyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minWeeklyPrice} maxVal={draft.maxWeeklyPrice}
                  onMin={(v) => set('minWeeklyPrice', v)} onMax={(v) => set('maxWeeklyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع (الموديل)" defaultOpen badge={draft.minYear || draft.maxYear ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minYear} maxVal={draft.maxYear}
                  onMin={(v) => set('minYear', v)} onMax={(v) => set('maxYear', v)}
                  ph={['أدنى سنة', 'أقصى سنة']}
                />
              </Accordion>

              <Accordion title="سعة الركاب (العدد)" defaultOpen={false} badge={draft.minPassengers || draft.maxPassengers ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minPassengers} maxVal={draft.maxPassengers}
                  onMin={(v) => set('minPassengers', v)} onMax={(v) => set('maxPassengers', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_AIRCRAFT_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {/* ── Rental Caravan–specific filters ── */}
          {isRentalCaravan && (
            <>
              <Accordion title="السعر الأسبوعي" defaultOpen={false} badge={draft.minWeeklyPrice || draft.maxWeeklyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minWeeklyPrice} maxVal={draft.maxWeeklyPrice}
                  onMin={(v) => set('minWeeklyPrice', v)} onMax={(v) => set('maxWeeklyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="السعر الشهري" defaultOpen={false} badge={draft.minMonthlyPrice || draft.maxMonthlyPrice ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMonthlyPrice} maxVal={draft.maxMonthlyPrice}
                  onMin={(v) => set('minMonthlyPrice', v)} onMax={(v) => set('maxMonthlyPrice', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سعة الأسرّة (عدد الأشخاص)" defaultOpen={false} badge={draft.minBedCapacity || draft.maxBedCapacity ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minBedCapacity} maxVal={draft.maxBedCapacity}
                  onMin={(v) => set('minBedCapacity', v)} onMax={(v) => set('maxBedCapacity', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سنة الصنع" defaultOpen={false} badge={draft.caravanYear ? 1 : undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  <select
                    value={draft.caravanYear}
                    onChange={(e) => set('caravanYear', e.target.value)}
                    className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                  >
                    <option value="">الكل</option>
                    {RENTAL_CARAVAN_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </Accordion>

              <Accordion title="نوع التأمين / الرعبون" defaultOpen={false} badge={draft.rentalDepositType ? 1 : undefined}>
                <select
                  value={draft.rentalDepositType}
                  onChange={(e) => set('rentalDepositType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CARAVAN_DEPOSIT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="كاسكو / تأمين شامل" defaultOpen={false} badge={draft.caravanInsurance ? 1 : undefined}>
                <select
                  value={draft.caravanInsurance}
                  onChange={(e) => set('caravanInsurance', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENTAL_CARAVAN_INSURANCE.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {/* ── Marine For Sale–specific filters ── */}
          {isMarineForSale && (
            <>
              <Accordion title="البائع / معروض من" defaultOpen badge={draft.marineSellerType ? 1 : undefined}>
                <select
                  value={draft.marineSellerType}
                  onChange={(e) => set('marineSellerType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MARINE_SELLER_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>

              <Accordion title="الحالة" defaultOpen={false} badge={draft.marineCondition ? 1 : undefined}>
                <select
                  value={draft.marineCondition}
                  onChange={(e) => set('marineCondition', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MARINE_CONDITION_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="قابل للمقايضة / تبديل" defaultOpen={false} badge={draft.marineExchange ? 1 : undefined}>
                <select
                  value={draft.marineExchange}
                  onChange={(e) => set('marineExchange', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {MARINE_EXCHANGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {/* ── Marine For Rent–specific filters ── */}
          {isMarineForRent && (
            <Accordion title="البائع / معروض من" defaultOpen badge={draft.marineSellerType ? 1 : undefined}>
              <select
                value={draft.marineSellerType}
                onChange={(e) => set('marineSellerType', e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
              >
                <option value="">الكل</option>
                {MARINE_SELLER_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Accordion>
          )}

          {/* ── Damaged Cars–specific filters ── */}
          {isDamagedCar && (
            <Accordion title="قابل للمقايضة / تبديل" defaultOpen badge={draft.damagedExchange ? 1 : undefined}>
              <select
                value={draft.damagedExchange}
                onChange={(e) => set('damagedExchange', e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
              >
                <option value="">الكل</option>
                {DAMAGED_EXCHANGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Accordion>
          )}

          {/* ── Damaged SUV–specific filters ── */}
          {isDamagedSuv && (
            <>
              <Accordion title="سنة الصنع" defaultOpen badge={draft.damagedYear ? 1 : undefined}>
                <select
                  value={draft.damagedYear}
                  onChange={(e) => set('damagedYear', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Accordion>

              <Accordion title="الكيلومترات (كم)" defaultOpen={false} badge={draft.minMileage || draft.maxMileage ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMileage} maxVal={draft.maxMileage}
                  onMin={(v) => set('minMileage', v)} onMax={(v) => set('maxMileage', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="نوع الغيارات" defaultOpen={false} badge={draft.damagedGear ? 1 : undefined}>
                <select
                  value={draft.damagedGear}
                  onChange={(e) => set('damagedGear', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_SUV_GEAR_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع الوقود" defaultOpen={false} badge={draft.damagedFuel ? 1 : undefined}>
                <select
                  value={draft.damagedFuel}
                  onChange={(e) => set('damagedFuel', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_SUV_FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="قابل للمقايضة / تبديل" defaultOpen={false} badge={draft.damagedExchange ? 1 : undefined}>
                <select
                  value={draft.damagedExchange}
                  onChange={(e) => set('damagedExchange', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_EXCHANGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="أجور الركن / أرضية" defaultOpen={false} badge={draft.damagedParkingFee ? 1 : undefined}>
                <select
                  value={draft.damagedParkingFee}
                  onChange={(e) => set('damagedParkingFee', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_PARKING_FEE.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة البيع" defaultOpen={false} badge={draft.damagedSalesStatus ? 1 : undefined}>
                <select
                  value={draft.damagedSalesStatus}
                  onChange={(e) => set('damagedSalesStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_SALES_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>

              <Accordion title="سبب الضرر" defaultOpen={false} badge={draft.damagedDamageCause ? 1 : undefined}>
                <select
                  value={draft.damagedDamageCause}
                  onChange={(e) => set('damagedDamageCause', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_DAMAGE_CAUSE.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="البائع" defaultOpen={false} badge={draft.damagedSeller ? 1 : undefined}>
                <select
                  value={draft.damagedSeller}
                  onChange={(e) => set('damagedSeller', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_SELLER_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {isDamagedMotorcycle && (
            <>
              <Accordion title="سنة الصنع" defaultOpen badge={draft.damagedYear ? 1 : undefined}>
                <select
                  value={draft.damagedYear}
                  onChange={(e) => set('damagedYear', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Accordion>

              <Accordion title="الكيلومترات (كم)" defaultOpen={false} badge={draft.minMileage || draft.maxMileage ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minMileage} maxVal={draft.maxMileage}
                  onMin={(v) => set('minMileage', v)} onMax={(v) => set('maxMileage', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="حالة الدراجة" defaultOpen={false} badge={draft.damagedMotoStatus ? 1 : undefined}>
                <select
                  value={draft.damagedMotoStatus}
                  onChange={(e) => set('damagedMotoStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_MOTORCYCLE_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>

              <Accordion title="قابل للمقايضة / تبديل" defaultOpen={false} badge={draft.damagedExchange ? 1 : undefined}>
                <select
                  value={draft.damagedExchange}
                  onChange={(e) => set('damagedExchange', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_EXCHANGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Accordion>

              <Accordion title="البائع" defaultOpen={false} badge={draft.damagedSeller ? 1 : undefined}>
                <select
                  value={draft.damagedSeller}
                  onChange={(e) => set('damagedSeller', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DAMAGED_SELLER_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {isDamagedMinivan && (
            <Accordion title="قابل للمقايضة / تبديل" defaultOpen={false} badge={draft.damagedExchange ? 1 : undefined}>
              <select
                value={draft.damagedExchange}
                onChange={(e) => set('damagedExchange', e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
              >
                <option value="">الكل</option>
                {DAMAGED_EXCHANGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Accordion>
          )}

          {isDamagedCommercial && (
            <Accordion title="قابل للمقايضة / تبديل" defaultOpen={false} badge={draft.damagedExchange ? 1 : undefined}>
              <select
                value={draft.damagedExchange}
                onChange={(e) => set('damagedExchange', e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
              >
                <option value="">الكل</option>
                {DAMAGED_EXCHANGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Accordion>
          )}

          {/* ── Car / generic filters (hidden on specialist commercial and other vehicle pages) ── */}
          {!isMotorcycle && !isElectric && !isMinivan && !isMinibus && !isBus && !isTruck && !isTractorTruck && !isTrailer && !isSmallTrailer && !isBodywork && !isTowTruck && !isCommercialPlates && !isResidentialForSale && !isResidentialForRent && !isDailyRental && !isResidentialTransfer && !isCommercialForSale && !isCommercialForRent && !isCommercialTransferSale && !isCommercialTransferRent && !isLandShare && !isLandForSale && !isLandForRent && !isProjectsRoute && !isBuildingForSale && !isBuildingForRent && !isTimeshareForSale && !isTimeshareForRent && !isTouristFacilitySale && !isTouristFacilityRent && !isPoolsForRent && !isRentalCars && !isRentalSuv && !isRentalMinivan && !isRentalMotorcycles && !isRentalClassic && !isRentalBus && !isRentalTruck && !isRentalRecovery && !isRentalTowTruck && !isRentalAircraft && !isRentalCaravan && !isRentalElectric && !isMarineForSale && !isMarineForRent && !isDamagedCar && !isDamagedSuv && !isDamagedMotorcycle && !isDamagedMinivan && !isDamagedCommercial && (
            <Accordion title="نوع الوقود" badge={draft.fuelTypes.length || undefined}>
              {FUEL_TYPE_OPTIONS.map((o) => (
                <CheckItem key={o.value} label={o.label}
                  checked={draft.fuelTypes.includes(o.value)}
                  onChange={() => toggle('fuelTypes', o.value)}
                />
              ))}
            </Accordion>
          )}

          {!isMotorcycle && !isMinivan && !isMinibus && !isBus && !isTruck && !isTractorTruck && !isTrailer && !isSmallTrailer && !isBodywork && !isTowTruck && !isCommercialPlates && !isResidentialForSale && !isResidentialForRent && !isDailyRental && !isResidentialTransfer && !isCommercialForSale && !isCommercialForRent && !isCommercialTransferSale && !isCommercialTransferRent && !isLandShare && !isLandForSale && !isLandForRent && !isProjectsRoute && !isBuildingForSale && !isBuildingForRent && !isTimeshareForSale && !isTimeshareForRent && !isTouristFacilitySale && !isTouristFacilityRent && !isPoolsForRent && !isRentalCars && !isRentalSuv && !isRentalMinivan && !isRentalMotorcycles && !isRentalClassic && !isRentalBus && !isRentalTruck && !isRentalRecovery && !isRentalTowTruck && !isRentalAircraft && !isRentalCaravan && !isRentalElectric && !isMarineForSale && !isMarineForRent && !isDamagedCar && !isDamagedSuv && !isDamagedMotorcycle && !isDamagedMinivan && !isDamagedCommercial && (
            <>
              <Accordion title="ناقل الحركة" badge={draft.transmissions.length || undefined}>
                {TRANSMISSION_OPTIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.transmissions.includes(o.value)}
                    onChange={() => toggle('transmissions', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="حالة السيارة" badge={draft.conditions.length || undefined}>
                <CheckItem label="مستعمل" checked={draft.conditions.includes('USED')} onChange={() => toggle('conditions', 'USED')} />
                <CheckItem label="جديد"   checked={draft.conditions.includes('NEW')}  onChange={() => toggle('conditions', 'NEW')} />
              </Accordion>

              <Accordion title="نوع الهيكل" defaultOpen={false} badge={draft.bodyType ? 1 : undefined}>
                <select
                  value={draft.bodyType}
                  onChange={(e) => set('bodyType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BODY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Accordion>

              <Accordion title="الدفع" defaultOpen={false} badge={draft.drivetrains.length || undefined}>
                {DRIVETRAIN_OPTIONS.map((o) => (
                  <CheckItem key={o.value} label={o.label}
                    checked={draft.drivetrains.includes(o.value)}
                    onChange={() => toggle('drivetrains', o.value)}
                  />
                ))}
              </Accordion>

              <Accordion title="اللون" defaultOpen={false} badge={draft.colors.length || undefined}>
                <div className="max-h-44 overflow-y-auto pr-1">
                  {CAR_COLORS.map((color) => (
                    <CheckItem key={color} label={color}
                      checked={draft.colors.includes(color)}
                      onChange={() => toggle('colors', color)}
                    />
                  ))}
                </div>
              </Accordion>
            </>
          )}

          {/* ── Shared filters (all vehicle categories) ── */}
          {!isMinibus && !isBus && !isTruck && !isTractorTruck && !isTrailer && !isSmallTrailer && !isBodywork && !isTowTruck && !isCommercialPlates && !isResidentialForSale && !isResidentialForRent && !isDailyRental && !isResidentialTransfer && !isCommercialForSale && !isCommercialForRent && !isCommercialTransferSale && !isCommercialTransferRent && !isLandShare && !isLandForSale && !isLandForRent && !isProjectsRoute && !isBuildingForSale && !isBuildingForRent && !isTimeshareForSale && !isTimeshareForRent && !isTouristFacilitySale && !isTouristFacilityRent && !isPoolsForRent && !isRentalCars && !isRentalSuv && !isRentalMinivan && !isRentalMotorcycles && !isRentalClassic && !isRentalBus && !isRentalTruck && !isRentalRecovery && !isRentalTowTruck && !isRentalAircraft && !isRentalCaravan && !isRentalElectric && !isMarineForSale && !isMarineForRent && !isDamagedCar && !isDamagedSuv && !isDamagedMotorcycle && !isDamagedMinivan && !isDamagedCommercial && (
            <Accordion title="كفالة" defaultOpen={false} badge={draft.warranty ? 1 : undefined}>
              <YesNoRadio value={draft.warranty} onChange={(v) => set('warranty', v)} />
            </Accordion>
          )}

          {!isMinibus && !isBus && !isTruck && !isTractorTruck && !isTrailer && !isSmallTrailer && !isBodywork && !isTowTruck && !isCommercialPlates && !isResidentialForSale && !isResidentialForRent && !isDailyRental && !isResidentialTransfer && !isCommercialForSale && !isCommercialForRent && !isCommercialTransferSale && !isCommercialTransferRent && !isLandShare && !isLandForSale && !isLandForRent && !isProjectsRoute && !isBuildingForSale && !isBuildingForRent && !isTimeshareForSale && !isTimeshareForRent && !isTouristFacilitySale && !isTouristFacilityRent && !isPoolsForRent && !isRentalCars && !isRentalSuv && !isRentalMinivan && !isRentalMotorcycles && !isRentalClassic && !isRentalBus && !isRentalTruck && !isRentalRecovery && !isRentalTowTruck && !isRentalAircraft && !isRentalCaravan && !isRentalElectric && !isMarineForSale && !isMarineForRent && !isDamagedCar && !isDamagedSuv && !isDamagedMotorcycle && !isDamagedMinivan && !isDamagedCommercial && (
            <Accordion title="سجل حوادث جسيمة" defaultOpen={false} badge={draft.heavyDamage ? 1 : undefined}>
              <YesNoRadio value={draft.heavyDamage} onChange={(v) => set('heavyDamage', v)} />
            </Accordion>
          )}

          {/* ── Land-share-specific filters ── */}
          {isLandShare && (
            <>
              <Accordion title="المساحة (م²)" defaultOpen badge={draft.minLandArea || draft.maxLandArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minLandArea} maxVal={draft.maxLandArea}
                  onMin={(v) => set('minLandArea', v)} onMax={(v) => set('maxLandArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="رقم المحضر / البلوك" defaultOpen={false} badge={draft.minBlockNo || draft.maxBlockNo ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minBlockNo} maxVal={draft.maxBlockNo}
                  onMin={(v) => set('minBlockNo', v)} onMax={(v) => set('maxBlockNo', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="رقم المقسم / العقار" defaultOpen={false} badge={draft.minParcelNo || draft.maxParcelNo ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minParcelNo} maxVal={draft.maxParcelNo}
                  onMin={(v) => set('minParcelNo', v)} onMax={(v) => set('maxParcelNo', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="الوضع التنظيمي / حالة الإعمار" defaultOpen={false} badge={draft.zoningStatus ? 1 : undefined}>
                <select
                  value={draft.zoningStatus}
                  onChange={(e) => set('zoningStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {ZONING_STATUSES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </Accordion>

              <Accordion title="نسبة البناء الطابقية (KAKS)" defaultOpen={false} badge={draft.kaks ? 1 : undefined}>
                <select
                  value={draft.kaks}
                  onChange={(e) => set('kaks', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {KAKS_VALUES.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Accordion>

              <Accordion title="الارتفاع الأقصى المسموح (غاباري)" defaultOpen={false} badge={draft.gabari ? 1 : undefined}>
                <select
                  value={draft.gabari}
                  onChange={(e) => set('gabari', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {GABARI_VALUES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة الطابو / سند الملكية" defaultOpen={false} badge={draft.landDeedStatus ? 1 : undefined}>
                <select
                  value={draft.landDeedStatus}
                  onChange={(e) => set('landDeedStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {LAND_DEED_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="من" badge={draft.fromWhosLand.length || undefined}>
                {FROM_WHO_LAND.map((o) => (
                  <CheckItem key={o} label={o}
                    checked={draft.fromWhosLand.includes(o)}
                    onChange={() => toggle('fromWhosLand', o)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Land for-sale-specific filters ── */}
          {isLandForSale && (
            <>
              <Accordion title="المساحة (م²)" defaultOpen badge={draft.minLandArea || draft.maxLandArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minLandArea} maxVal={draft.maxLandArea}
                  onMin={(v) => set('minLandArea', v)} onMax={(v) => set('maxLandArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="سعر المتر المربع" defaultOpen={false} badge={draft.minPricePerM2 || draft.maxPricePerM2 ? 1 : undefined}>
                <div className="flex gap-1.5 px-3 pt-2 pb-1">
                  {(['SYP', 'USD'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('pricePerM2Currency', c)}
                      className={cn(
                        'flex-1 py-1 text-xs font-semibold rounded border transition-colors',
                        draft.pricePerM2Currency === c
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-gray-300 text-gray-600 hover:border-orange-400',
                      )}
                    >
                      {c === 'SYP' ? 'ل.س' : 'USD'}
                    </button>
                  ))}
                </div>
                <RangeInputs
                  minVal={draft.minPricePerM2} maxVal={draft.maxPricePerM2}
                  onMin={(v) => set('minPricePerM2', v)} onMax={(v) => set('maxPricePerM2', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="رقم المحضر / البلوك" defaultOpen={false} badge={draft.minBlockNo || draft.maxBlockNo ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minBlockNo} maxVal={draft.maxBlockNo}
                  onMin={(v) => set('minBlockNo', v)} onMax={(v) => set('maxBlockNo', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="رقم المقسم / العقار" defaultOpen={false} badge={draft.minParcelNo || draft.maxParcelNo ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minParcelNo} maxVal={draft.maxParcelNo}
                  onMin={(v) => set('minParcelNo', v)} onMax={(v) => set('maxParcelNo', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="نسبة البناء الطابقية (KAKS)" defaultOpen={false} badge={draft.kaks ? 1 : undefined}>
                <select
                  value={draft.kaks}
                  onChange={(e) => set('kaks', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {KAKS_VALUES.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Accordion>

              <Accordion title="الارتفاع الأقصى المسموح (غاباري)" defaultOpen={false} badge={draft.gabari ? 1 : undefined}>
                <select
                  value={draft.gabari}
                  onChange={(e) => set('gabari', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {GABARI_VALUES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة الطابو / سند الملكية" defaultOpen={false} badge={draft.landDeedStatus ? 1 : undefined}>
                <select
                  value={draft.landDeedStatus}
                  onChange={(e) => set('landDeedStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {LAND_DEED_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="من" badge={draft.fromWhosLand.length || undefined}>
                {FROM_WHO_LAND.map((o) => (
                  <CheckItem key={o} label={o}
                    checked={draft.fromWhosLand.includes(o)}
                    onChange={() => toggle('fromWhosLand', o)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Land for-rent-specific filters ── */}
          {isLandForRent && (
            <>
              <Accordion title="المساحة (م²)" defaultOpen badge={draft.minLandArea || draft.maxLandArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minLandArea} maxVal={draft.maxLandArea}
                  onMin={(v) => set('minLandArea', v)} onMax={(v) => set('maxLandArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="الوضع التنظيمي / حالة الإعمار" defaultOpen={false} badge={draft.zoningStatus ? 1 : undefined}>
                <select
                  value={draft.zoningStatus}
                  onChange={(e) => set('zoningStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {LAND_RENT_ZONING_STATUSES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </Accordion>

              <Accordion title="نسبة البناء الطابقية (KAKS)" defaultOpen={false} badge={draft.kaks ? 1 : undefined}>
                <select
                  value={draft.kaks}
                  onChange={(e) => set('kaks', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {LAND_RENT_KAKS_VALUES.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Accordion>

              <Accordion title="الارتفاع الأقصى المسموح (غاباري)" defaultOpen={false} badge={draft.gabari ? 1 : undefined}>
                <select
                  value={draft.gabari}
                  onChange={(e) => set('gabari', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {GABARI_VALUES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Accordion>

              <Accordion title="تأمين / ديبوزيت" defaultOpen={false} badge={draft.hasDeposit ? 1 : undefined}>
                <YesNoRadio value={draft.hasDeposit} onChange={(v) => set('hasDeposit', v)} />
              </Accordion>

              <Accordion title="حالة الطابو / سند الملكية" defaultOpen={false} badge={draft.landDeedStatus ? 1 : undefined}>
                <select
                  value={draft.landDeedStatus}
                  onChange={(e) => set('landDeedStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {LAND_DEED_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="من" badge={draft.fromWhosLand.length || undefined}>
                {FROM_WHO_LAND.map((o) => (
                  <CheckItem key={o} label={o}
                    checked={draft.fromWhosLand.includes(o)}
                    onChange={() => toggle('fromWhosLand', o)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Building for-sale-specific filters ── */}
          {isBuildingForSale && (
            <>
              <Accordion title="المساحة (م²)" defaultOpen badge={draft.minGrossArea || draft.maxGrossArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minGrossArea} maxVal={draft.maxGrossArea}
                  onMin={(v) => set('minGrossArea', v)} onMax={(v) => set('maxGrossArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="عدد الطوابق في المبنى" defaultOpen={false} badge={draft.totalFloors ? 1 : undefined}>
                <select
                  value={draft.totalFloors}
                  onChange={(e) => set('totalFloors', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_FLOOR_COUNTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الشقق في الطابق الواحد" defaultOpen={false} badge={draft.apartmentsPerFloor ? 1 : undefined}>
                <select
                  value={draft.apartmentsPerFloor}
                  onChange={(e) => set('apartmentsPerFloor', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {APARTMENTS_PER_FLOOR.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التدفئة" defaultOpen={false} badge={draft.heatingType ? 1 : undefined}>
                <select
                  value={draft.heatingType}
                  onChange={(e) => set('heatingType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_HEATING_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Accordion>

              <Accordion title="عمر البناء" defaultOpen={false} badge={draft.buildingAge ? 1 : undefined}>
                <select
                  value={draft.buildingAge}
                  onChange={(e) => set('buildingAge', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_AGE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Accordion>

              <Accordion title="مصعد" defaultOpen={false} badge={draft.hasElevator ? 1 : undefined}>
                <YesNoRadio value={draft.hasElevator} onChange={(v) => set('hasElevator', v)} />
              </Accordion>

              <Accordion title="موقف سيارات" defaultOpen={false} badge={draft.parkingType ? 1 : undefined}>
                <select
                  value={draft.parkingType}
                  onChange={(e) => set('parkingType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_PARKING_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة الطابو / سند الملكية" defaultOpen={false} badge={draft.deedStatus ? 1 : undefined}>
                <select
                  value={draft.deedStatus}
                  onChange={(e) => set('deedStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_DEED_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="من" badge={draft.fromWhosBuilding.length || undefined}>
                {FROM_WHO_BUILDING.map((o) => (
                  <CheckItem key={o} label={o}
                    checked={draft.fromWhosBuilding.includes(o)}
                    onChange={() => toggle('fromWhosBuilding', o)}
                  />
                ))}
              </Accordion>

              <Accordion title="قابل للمقايضة" defaultOpen={false} badge={draft.tradeIn ? 1 : undefined}>
                <YesNoRadio value={draft.tradeIn} onChange={(v) => set('tradeIn', v)} />
              </Accordion>
            </>
          )}

          {/* ── Building for-rent-specific filters ── */}
          {isBuildingForRent && (
            <>
              <Accordion title="المساحة (م²)" defaultOpen badge={draft.minGrossArea || draft.maxGrossArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minGrossArea} maxVal={draft.maxGrossArea}
                  onMin={(v) => set('minGrossArea', v)} onMax={(v) => set('maxGrossArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="عدد الطوابق في المبنى" defaultOpen={false} badge={draft.totalFloors ? 1 : undefined}>
                <select
                  value={draft.totalFloors}
                  onChange={(e) => set('totalFloors', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_FLOOR_COUNTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الشقق في الطابق الواحد" defaultOpen={false} badge={draft.apartmentsPerFloor ? 1 : undefined}>
                <select
                  value={draft.apartmentsPerFloor}
                  onChange={(e) => set('apartmentsPerFloor', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {APARTMENTS_PER_FLOOR.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Accordion>

              <Accordion title="نوع التدفئة" defaultOpen={false} badge={draft.heatingType ? 1 : undefined}>
                <select
                  value={draft.heatingType}
                  onChange={(e) => set('heatingType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_HEATING_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Accordion>

              <Accordion title="عمر البناء" defaultOpen={false} badge={draft.buildingAge ? 1 : undefined}>
                <select
                  value={draft.buildingAge}
                  onChange={(e) => set('buildingAge', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_AGE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Accordion>

              <Accordion title="مصعد" defaultOpen={false} badge={draft.hasElevator ? 1 : undefined}>
                <YesNoRadio value={draft.hasElevator} onChange={(v) => set('hasElevator', v)} />
              </Accordion>

              <Accordion title="موقف سيارات" defaultOpen={false} badge={draft.parkingType ? 1 : undefined}>
                <select
                  value={draft.parkingType}
                  onChange={(e) => set('parkingType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_PARKING_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="تأمين / ديبوزيت" defaultOpen={false} badge={draft.hasDeposit ? 1 : undefined}>
                <YesNoRadio value={draft.hasDeposit} onChange={(v) => set('hasDeposit', v)} />
              </Accordion>

              <Accordion title="حالة الطابو / سند الملكية" defaultOpen={false} badge={draft.deedStatus ? 1 : undefined}>
                <select
                  value={draft.deedStatus}
                  onChange={(e) => set('deedStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_DEED_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="من" badge={draft.fromWhosBuilding.length || undefined}>
                {FROM_WHO_BUILDING.map((o) => (
                  <CheckItem key={o} label={o}
                    checked={draft.fromWhosBuilding.includes(o)}
                    onChange={() => toggle('fromWhosBuilding', o)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Timeshare for-sale-specific filters ── */}
          {isTimeshareForSale && (
            <>
              <Accordion title="المساحة الإجمالية (م²)" defaultOpen badge={draft.minGrossArea || draft.maxGrossArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minGrossArea} maxVal={draft.maxGrossArea}
                  onMin={(v) => set('minGrossArea', v)} onMax={(v) => set('maxGrossArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="المساحة الصافية (م²)" defaultOpen={false} badge={draft.minNetArea || draft.maxNetArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minNetArea} maxVal={draft.maxNetArea}
                  onMin={(v) => set('minNetArea', v)} onMax={(v) => set('maxNetArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="الفترة / الأسبوع" defaultOpen={false} badge={draft.timesharePeriod ? 1 : undefined}>
                <select
                  value={draft.timesharePeriod}
                  onChange={(e) => set('timesharePeriod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الغرف" defaultOpen={false} badge={draft.roomCount ? 1 : undefined}>
                <select
                  value={draft.roomCount}
                  onChange={(e) => set('roomCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_ROOM_COUNTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة العقار" defaultOpen={false} badge={draft.timeshareCondition ? 1 : undefined}>
                <select
                  value={draft.timeshareCondition}
                  onChange={(e) => set('timeshareCondition', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة الطابو / سند الملكية" defaultOpen={false} badge={draft.deedStatus ? 1 : undefined}>
                <select
                  value={draft.deedStatus}
                  onChange={(e) => set('deedStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_DEED_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="من" badge={draft.fromWhosTimeshare.length || undefined}>
                {FROM_WHO_TIMESHARE.map((o) => (
                  <CheckItem key={o} label={o}
                    checked={draft.fromWhosTimeshare.includes(o)}
                    onChange={() => toggle('fromWhosTimeshare', o)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Tourist facility for-sale-specific filters ── */}
          {isTouristFacilitySale && (
            <>
              <Accordion title="حالة العقار" defaultOpen badge={draft.touristFacilityCondition ? 1 : undefined}>
                <select
                  value={draft.touristFacilityCondition}
                  onChange={(e) => set('touristFacilityCondition', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {/* ── Tourist facility for-rent-specific filters ── */}
          {isTouristFacilityRent && (
            <>
              <Accordion title="حالة العقار" defaultOpen badge={draft.touristFacilityCondition ? 1 : undefined}>
                <select
                  value={draft.touristFacilityCondition}
                  onChange={(e) => set('touristFacilityCondition', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {/* ── Pools for-rent-specific filters ── */}
          {isPoolsForRent && (
            <>
              <Accordion title="مدة الإيجار" defaultOpen badge={draft.poolRentalDuration ? 1 : undefined}>
                <select
                  value={draft.poolRentalDuration}
                  onChange={(e) => set('poolRentalDuration', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {POOL_RENTAL_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="سعة الأشخاص" defaultOpen={false} badge={draft.poolCapacity ? 1 : undefined}>
                <select
                  value={draft.poolCapacity}
                  onChange={(e) => set('poolCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {POOL_CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Accordion>

              <Accordion title="عمق المسبح" defaultOpen={false} badge={draft.poolDepth ? 1 : undefined}>
                <select
                  value={draft.poolDepth}
                  onChange={(e) => set('poolDepth', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {POOL_DEPTHS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="المرافق والميزات" defaultOpen={false} badge={draft.poolFacilities.length || undefined}>
                {POOL_FACILITIES.map((f) => (
                  <CheckItem key={f} label={f}
                    checked={draft.poolFacilities.includes(f)}
                    onChange={() => toggle('poolFacilities', f)}
                  />
                ))}
              </Accordion>

              <Accordion title="من" badge={draft.fromWhosPool.length || undefined}>
                {FROM_WHO_POOL.map((o) => (
                  <CheckItem key={o} label={o}
                    checked={draft.fromWhosPool.includes(o)}
                    onChange={() => toggle('fromWhosPool', o)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Timeshare for-rent-specific filters ── */}
          {isTimeshareForRent && (
            <>
              <Accordion title="المساحة الإجمالية (م²)" defaultOpen badge={draft.minGrossArea || draft.maxGrossArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minGrossArea} maxVal={draft.maxGrossArea}
                  onMin={(v) => set('minGrossArea', v)} onMax={(v) => set('maxGrossArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="المساحة الصافية (م²)" defaultOpen={false} badge={draft.minNetArea || draft.maxNetArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minNetArea} maxVal={draft.maxNetArea}
                  onMin={(v) => set('minNetArea', v)} onMax={(v) => set('maxNetArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="الفترة / الأسبوع" defaultOpen={false} badge={draft.timesharePeriod ? 1 : undefined}>
                <select
                  value={draft.timesharePeriod}
                  onChange={(e) => set('timesharePeriod', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="المدة" defaultOpen={false} badge={draft.rentDuration ? 1 : undefined}>
                <select
                  value={draft.rentDuration}
                  onChange={(e) => set('rentDuration', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {RENT_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الغرف" defaultOpen={false} badge={draft.roomCount ? 1 : undefined}>
                <select
                  value={draft.roomCount}
                  onChange={(e) => set('roomCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_ROOM_COUNTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Accordion>

              <Accordion title="سعة الأشخاص" defaultOpen={false} badge={draft.guestCapacity ? 1 : undefined}>
                <select
                  value={draft.guestCapacity}
                  onChange={(e) => set('guestCapacity', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {GUEST_CAPACITIES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الأسرة" defaultOpen={false} badge={draft.bedCount ? 1 : undefined}>
                <select
                  value={draft.bedCount}
                  onChange={(e) => set('bedCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BED_COUNTS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الحمامات" defaultOpen={false} badge={draft.bathroomCount ? 1 : undefined}>
                <select
                  value={draft.bathroomCount}
                  onChange={(e) => set('bathroomCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TIMESHARE_ROOM_COUNTS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Accordion>

              <Accordion title="من" badge={draft.fromWhosTimeshareRent.length || undefined}>
                {FROM_WHO_TIMESHARE_RENT.map((o) => (
                  <CheckItem key={o} label={o}
                    checked={draft.fromWhosTimeshareRent.includes(o)}
                    onChange={() => toggle('fromWhosTimeshareRent', o)}
                  />
                ))}
              </Accordion>
            </>
          )}

          {/* ── Housing projects-specific filters ── */}
          {isProjectsRoute && (
            <>
              <Accordion title="المساحة الإجمالية (م²)" defaultOpen badge={draft.minGrossArea || draft.maxGrossArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minGrossArea} maxVal={draft.maxGrossArea}
                  onMin={(v) => set('minGrossArea', v)} onMax={(v) => set('maxGrossArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="حالة المشروع" defaultOpen badge={draft.projectStatus ? 1 : undefined}>
                <select
                  value={draft.projectStatus}
                  onChange={(e) => set('projectStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {PROJECT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الغرف" defaultOpen={false} badge={draft.roomCount ? 1 : undefined}>
                <select
                  value={draft.roomCount}
                  onChange={(e) => set('roomCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {PROJECT_ROOM_COUNTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الطوابق" defaultOpen={false} badge={draft.totalFloors ? 1 : undefined}>
                <select
                  value={draft.totalFloors}
                  onChange={(e) => set('totalFloors', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TOTAL_FLOORS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="التدفئة" defaultOpen={false} badge={draft.heatingType ? 1 : undefined}>
                <select
                  value={draft.heatingType}
                  onChange={(e) => set('heatingType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {PROJECT_HEATING_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Accordion>

              <Accordion title="ضمن مجمع سكني" defaultOpen={false} badge={draft.isInComplex ? 1 : undefined}>
                <YesNoRadio value={draft.isInComplex} onChange={(v) => set('isInComplex', v)} />
              </Accordion>

              <Accordion title="موقف سيارات" defaultOpen={false} badge={draft.parkingType ? 1 : undefined}>
                <select
                  value={draft.parkingType}
                  onChange={(e) => set('parkingType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {PARKING_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة الطابو / سند الملكية" defaultOpen={false} badge={draft.deedStatus ? 1 : undefined}>
                <select
                  value={draft.deedStatus}
                  onChange={(e) => set('deedStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {PROJECT_DEED_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {/* ── Residential filters (shared by for-sale, for-rent, and daily-rental) ── */}
          {(isResidentialForSale || isResidentialForRent || isDailyRental) && (
            <>
              <Accordion title="المساحة الإجمالية (م²)" defaultOpen badge={draft.minGrossArea || draft.maxGrossArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minGrossArea} maxVal={draft.maxGrossArea}
                  onMin={(v) => set('minGrossArea', v)} onMax={(v) => set('maxGrossArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="المساحة الصافية (م²)" defaultOpen={false} badge={draft.minNetArea || draft.maxNetArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minNetArea} maxVal={draft.maxNetArea}
                  onMin={(v) => set('minNetArea', v)} onMax={(v) => set('maxNetArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="المساحة المفتوحة (م²)" defaultOpen={false} badge={draft.minOpenArea || draft.maxOpenArea ? 1 : undefined}>
                <RangeInputs
                  minVal={draft.minOpenArea} maxVal={draft.maxOpenArea}
                  onMin={(v) => set('minOpenArea', v)} onMax={(v) => set('maxOpenArea', v)}
                  ph={['أدنى حد', 'أقصى حد']}
                />
              </Accordion>

              <Accordion title="عدد الغرف" defaultOpen badge={draft.roomCount ? 1 : undefined}>
                <select
                  value={draft.roomCount}
                  onChange={(e) => set('roomCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {ROOM_COUNTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Accordion>

              <Accordion title="عمر البناء" defaultOpen={false} badge={draft.buildingAge ? 1 : undefined}>
                <select
                  value={draft.buildingAge}
                  onChange={(e) => set('buildingAge', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BUILDING_AGES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Accordion>

              <Accordion title="الطابق" defaultOpen={false} badge={draft.floorNumber ? 1 : undefined}>
                <select
                  value={draft.floorNumber}
                  onChange={(e) => set('floorNumber', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {FLOOR_NUMBERS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الطوابق" defaultOpen={false} badge={draft.totalFloors ? 1 : undefined}>
                <select
                  value={draft.totalFloors}
                  onChange={(e) => set('totalFloors', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {TOTAL_FLOORS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Accordion>

              <Accordion title="التدفئة" defaultOpen={false} badge={draft.heatingType ? 1 : undefined}>
                <select
                  value={draft.heatingType}
                  onChange={(e) => set('heatingType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {HEATING_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Accordion>

              <Accordion title="عدد الحمامات" defaultOpen={false} badge={draft.bathroomCount ? 1 : undefined}>
                <select
                  value={draft.bathroomCount}
                  onChange={(e) => set('bathroomCount', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {BATHROOM_COUNTS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Accordion>

              <Accordion title="المطبخ" defaultOpen={false} badge={draft.kitchenType ? 1 : undefined}>
                <select
                  value={draft.kitchenType}
                  onChange={(e) => set('kitchenType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {KITCHEN_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Accordion>

              <Accordion title="شرفة" defaultOpen={false} badge={draft.hasBalcony ? 1 : undefined}>
                <YesNoRadio value={draft.hasBalcony} onChange={(v) => set('hasBalcony', v)} />
              </Accordion>

              <Accordion title="مصعد" defaultOpen={false} badge={draft.hasElevator ? 1 : undefined}>
                <YesNoRadio value={draft.hasElevator} onChange={(v) => set('hasElevator', v)} />
              </Accordion>

              <Accordion title="مفروش" defaultOpen={false} badge={draft.isFurnished ? 1 : undefined}>
                <YesNoRadio value={draft.isFurnished} onChange={(v) => set('isFurnished', v)} />
              </Accordion>

              <Accordion title="ضمن مجمع سكني" defaultOpen={false} badge={draft.isInComplex ? 1 : undefined}>
                <YesNoRadio value={draft.isInComplex} onChange={(v) => set('isInComplex', v)} />
              </Accordion>

              <Accordion title="موقف سيارات" defaultOpen={false} badge={draft.parkingType ? 1 : undefined}>
                <select
                  value={draft.parkingType}
                  onChange={(e) => set('parkingType', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {PARKING_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة الاستخدام" defaultOpen={false} badge={draft.usageStatus ? 1 : undefined}>
                <select
                  value={draft.usageStatus}
                  onChange={(e) => set('usageStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {USAGE_STATUSES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Accordion>

              <Accordion title="حالة الطابو / سند الملكية" defaultOpen={false} badge={draft.deedStatus ? 1 : undefined}>
                <select
                  value={draft.deedStatus}
                  onChange={(e) => set('deedStatus', e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400 bg-white text-gray-700"
                >
                  <option value="">الكل</option>
                  {DEED_STATUSES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Accordion>
            </>
          )}

          {!isResidentialTransfer && !isLandShare && !isLandForRent && !isProjectsRoute && !isBuildingForSale && !isBuildingForRent && !isTimeshareForSale && !isTimeshareForRent && !isTouristFacilitySale && !isTouristFacilityRent && !isPoolsForRent && !isRentalCars && !isRentalSuv && !isRentalMinivan && !isRentalMotorcycles && !isRentalClassic && !isRentalBus && !isRentalTruck && !isRentalRecovery && !isRentalTowTruck && !isRentalAircraft && !isRentalCaravan && !isRentalElectric && !isMarineForSale && !isMarineForRent && !isDamagedCar && !isDamagedSuv && !isDamagedMotorcycle && !isDamagedMinivan && !isDamagedCommercial && (
            <Accordion title="قابل للمقايضة" defaultOpen={false} badge={draft.tradeIn ? 1 : undefined}>
              <YesNoRadio value={draft.tradeIn} onChange={(v) => set('tradeIn', v)} />
            </Accordion>
          )}

          {!isResidentialForSale && !isResidentialForRent && !isDailyRental && !isResidentialTransfer && !isLandShare && !isLandForSale && !isLandForRent && !isProjectsRoute && !isBuildingForSale && !isBuildingForRent && !isTimeshareForSale && !isTimeshareForRent && !isTouristFacilitySale && !isTouristFacilityRent && !isPoolsForRent && !isRentalCars && !isRentalSuv && !isRentalMinivan && !isRentalMotorcycles && !isRentalClassic && !isRentalBus && !isRentalTruck && !isRentalRecovery && !isRentalTowTruck && !isRentalAircraft && !isRentalCaravan && !isRentalElectric && !isMarineForSale && !isMarineForRent && !isDamagedCar && !isDamagedSuv && !isDamagedMotorcycle && !isDamagedMinivan && !isDamagedCommercial && (
            <Accordion title="من" badge={draft.fromWhos.length || undefined}>
              {FROM_WHO_OPTIONS.map((o) => (
                <CheckItem key={o.value} label={o.label}
                  checked={draft.fromWhos.includes(o.value)}
                  onChange={() => toggle('fromWhos', o.value)}
                />
              ))}
            </Accordion>
          )}

          {!isLandShare && (isResidentialForSale || isResidentialForRent || isDailyRental) && (
            <Accordion title="من" badge={draft.fromWhosRealEstate.length || undefined}>
              {FROM_WHO_REAL_ESTATE.map((o) => (
                <CheckItem key={o} label={o}
                  checked={draft.fromWhosRealEstate.includes(o)}
                  onChange={() => toggle('fromWhosRealEstate', o)}
                />
              ))}
            </Accordion>
          )}

        </div>
      </div>

      {/* ── Sticky "Ara" footer ── */}
      <div className="shrink-0 border-t border-gray-100 p-3 bg-white space-y-1.5">
        <button type="button" onClick={apply}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
        >
          <Search className="w-4 h-4" />
          بحث
        </button>
        {isActive && (
          <button type="button" onClick={clear}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-red-500 py-1.5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            مسح الفلاتر
          </button>
        )}
      </div>

    </div>
  );
}
