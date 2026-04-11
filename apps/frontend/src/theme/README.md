# Crypto Finance Theme Documentation

## Overview

Dark crypto/finance app theme with deep black backgrounds and purple accents.

## Color Palette (from Image)

### ⬛ Deep Dark Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0A0A0F` | Main background (almost black) |
| `--color-card` | `#15151C` | Card backgrounds |
| `--color-elevated` | `#1E1E28` | Elevated/hover states |
| `--color-border` | `#2A2A35` | Borders and dividers |

### 💜 Purple Primary Accent

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#7B61FF` | Primary buttons, active states |
| `--color-primary-hover` | `#9B87FF` | Hover states |
| `--color-primary-active` | `#A855F7` | Active states |

### 📝 Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-text` | `#FFFFFF` | Primary text |
| `--text-secondary` | `#6B7280` | Secondary/muted text |
| `--text-muted` | `#4B5563` | Disabled text |

### ✅ Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#22C55E` | Positive values, up trends |
| `--color-danger` | `#EF4444` | Negative values, down trends |
| `--color-warning` | `#F59E0B` | Warnings |
| `--color-info` | `#3B82F6` | Info states |

## Usage Examples

### Basic Layout

```vue
<template>
  <!-- Main background -->
  <div class="min-h-screen bg-deep-bg">
    
    <!-- Regular card -->
    <div class="crypto-card">
      <h2 class="text-white text-xl font-semibold">Total Balance</h2>
      <p class="text-gray-500 text-sm">$56,890.00</p>
    </div>
    
    <!-- Purple portfolio card -->
    <div class="portfolio-card">
      <h3 class="text-white font-bold">Stocks</h3>
      <p class="text-white/80">$5,687.99</p>
      <span class="text-white/60 text-sm">+1.35%</span>
    </div>
  </div>
</template>
```

### Tailwind Classes

```vue
<!-- Backgrounds -->
<div class="bg-deep-bg">Main background</div>
<div class="bg-deep-card">Card surface</div>
<div class="bg-deep-elevated">Elevated surface</div>

<!-- Text -->
<span class="text-white">Primary text</span>
<span class="text-gray-500">Secondary text</span>
<span class="text-purple-700">Accent text</span>
<span class="text-green-500">Success (+)</span>
<span class="text-red-500">Danger (-)</span>

<!-- Borders -->
<div class="border border-deep-border">Card border</div>

<!-- Buttons -->
<button class="bg-purple-700 hover:bg-purple-400 text-white rounded-2xl px-6 py-3">
  Buy
</button>
```

### Navigation

```vue
<template>
  <div class="fixed bottom-0 left-0 right-0 bottom-nav">
    <div class="flex justify-around py-3">
      <button class="nav-item active">
        <i class="pi pi-home" />
        <span>Home</span>
      </button>
      <button class="nav-item">
        <i class="pi pi-chart-line" />
        <span>Market</span>
      </button>
    </div>
  </div>
</template>

<style>
.nav-item {
  color: #6B7280;
}
.nav-item.active {
  color: #7B61FF;
}
</style>
```

## PrimeVue Components

All PrimeVue components are styled automatically:

```vue
<template>
  <!-- Purple primary button -->
  <Button severity="primary" label="Buy AAPL" />
  
  <!-- Dark card -->
  <Card>
    <template #title>Bitcoin</template>
    <template #content>
      <span class="text-green-500">+0.35%</span>
    </template>
  </Card>
  
  <!-- Dark input -->
  <InputText placeholder="Search..." />
  
  <!-- Dark select with purple selected -->
  <Select :options="assets" optionLabel="name" />
</template>
```

## Pre-built Classes

```css
/* Main app background */
.app-background {
  background-color: #0A0A0F;
}

/* Card */
.crypto-card {
  background-color: #15151C;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

/* Purple gradient card */
.portfolio-card {
  background: linear-gradient(135deg, #7B61FF 0%, #6D28D9 100%);
  border-radius: 20px;
}

/* Bottom navigation */
.bottom-nav {
  background-color: #15151C;
  border-top: 1px solid #2A2A35;
}
```

## Files Structure

```
src/
├── theme/
│   ├── primeval-theme.ts    # PrimeVue theme preset
│   └── README.md            # This documentation
├── styles.css               # Global styles with CSS variables
└── main.ts                  # PrimeVue configuration
```
