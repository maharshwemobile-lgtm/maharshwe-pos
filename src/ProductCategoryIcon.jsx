import React from 'react';
import {
  BatteryCharging,
  Cable,
  Camera,
  Gamepad2,
  HardDrive,
  Headphones,
  Laptop,
  Mouse,
  Package,
  PlugZap,
  Shield,
  Smartphone,
  Speaker,
  Tablet,
  Watch,
  Wrench,
} from 'lucide-react';
import './product-category-icon.css';

function searchableText(item = {}) {
  return [
    item.productType,
    item.type,
    item.category,
    item.categoryName,
    item.category?.name,
    item.groupName,
    item.productName,
    item.name,
    item.brand,
    item.model,
    item.product?.productType,
    item.product?.groupName,
    item.product?.name,
    item.product?.brand,
    item.product?.model,
  ].filter(Boolean).join(' ').toLowerCase();
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

export function productIconInfo(item) {
  const text = searchableText(item);

  if (includesAny(text, ['earphone', 'earbuds', 'headphone', 'headset', 'airpod', 'နားကြပ်'])) {
    return { Icon: Headphones, label: 'Earphone', tone: 'purple' };
  }
  if (includesAny(text, ['charger', 'adapter', 'charging head', 'power adapter', 'အားသွင်းခေါင်း'])) {
    return { Icon: PlugZap, label: 'Charger', tone: 'orange' };
  }
  if (includesAny(text, ['cable', 'usb', 'type-c', 'type c', 'lightning', 'ကြိုး'])) {
    return { Icon: Cable, label: 'Cable', tone: 'blue' };
  }
  if (includesAny(text, ['battery', 'ဘက်ထရီ'])) {
    return { Icon: BatteryCharging, label: 'Battery', tone: 'green' };
  }
  if (includesAny(text, ['cover', 'case', 'casing', 'bumper', 'screen protector', 'tempered', 'glass', 'မှန်', 'ကာဗာ'])) {
    return { Icon: Shield, label: 'Cover / Glass', tone: 'pink' };
  }
  if (includesAny(text, ['speaker', 'bluetooth speaker', 'စပီကာ'])) {
    return { Icon: Speaker, label: 'Speaker', tone: 'amber' };
  }
  if (includesAny(text, ['smart watch', 'smartwatch', 'watch', 'နာရီ'])) {
    return { Icon: Watch, label: 'Watch', tone: 'cyan' };
  }
  if (includesAny(text, ['tablet', 'ipad', 'tab '])) {
    return { Icon: Tablet, label: 'Tablet', tone: 'indigo' };
  }
  if (includesAny(text, ['laptop', 'notebook', 'computer', 'desktop', 'ကွန်ပျူတာ'])) {
    return { Icon: Laptop, label: 'Computer', tone: 'slate' };
  }
  if (includesAny(text, ['memory', 'sd card', 'flash drive', 'usb drive', 'storage', 'hard disk', 'ssd'])) {
    return { Icon: HardDrive, label: 'Storage', tone: 'teal' };
  }
  if (includesAny(text, ['mouse', 'မောက်စ်'])) {
    return { Icon: Mouse, label: 'Mouse', tone: 'slate' };
  }
  if (includesAny(text, ['camera', 'ကင်မရာ'])) {
    return { Icon: Camera, label: 'Camera', tone: 'blue' };
  }
  if (includesAny(text, ['gamepad', 'controller', 'gaming'])) {
    return { Icon: Gamepad2, label: 'Gaming', tone: 'red' };
  }
  if (includesAny(text, ['spare part', 'repair part', 'service part', 'lcd', 'display', 'flex', 'ic ', 'အပိုပစ္စည်း'])) {
    return { Icon: Wrench, label: 'Repair Part', tone: 'red' };
  }
  if (includesAny(text, ['phone', 'mobile', 'smartphone', 'handset', 'iphone', 'ဖုန်း'])) {
    return { Icon: Smartphone, label: 'Phone', tone: 'green' };
  }
  if (includesAny(text, ['accessories', 'accessory', 'အက်ဆက်စရီ'])) {
    return { Icon: Package, label: 'Accessories', tone: 'violet' };
  }

  return { Icon: Package, label: 'Product', tone: 'gray' };
}

export default function ProductCategoryIcon({ item, size = 20, className = '' }) {
  const { Icon, label, tone } = productIconInfo(item);
  return (
    <span className={`product-kind-icon product-kind-${tone} ${className}`.trim()} title={label} aria-label={label}>
      <Icon size={size} strokeWidth={2.2} />
    </span>
  );
}
