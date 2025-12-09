# UI/UX Guide - Clevio AI Staff Dashboard

## 🎨 Prinsip Desain

### Filosofi Desain
**"Minimalis, Korporat, Modern, dan Modis"**

Dashboard Clevio AI Staff dirancang dengan pendekatan **minimalis yang fungsional** yang mengutamakan kemudahan penggunaan tanpa mengorbankan estetika korporat yang profesional. Setiap elemen dirancang untuk memberikan pengalaman yang **modern dan modis** dengan tetap mempertahankan konsistensi visual yang kuat.

### Prinsip Utama
1. **Kesederhanaan Fungsional**: Setiap elemen memiliki tujuan yang jelas
2. **Hierarki Visual**: Informasi penting selalu menonjol
3. **Konsistensi**: Desain seragam di seluruh platform
4. **Responsivitas**: Pengalaman optimal di semua perangkat
5. **Aksesibilitas**: Mudah diakses oleh semua pengguna

---

## 🎨 Sistem Warna

### Mode Terang (Light Mode)

#### Warna Primer - Gradien Biru Korporat
```css
--primary: #3B82F6;      /* Blue-500 - Utama */
--primary-dark: #1E40AF;  /* Blue-800 - Aksen gelap */
--primary-light: #60A5FA; /* Blue-400 - Aksen terang */
```

#### Warna Netral
```css
--background: #FFFFFF;   /* Putih bersih */
--foreground: #111827;   /* Text utama */
--surface: #F9FAFB;      /* Kartu dan panels */
--surface-strong: #F3F4F6; /* Borders dan dividers */
--border: #E5E7EB;       /* Garis tepi */
```

#### Warna Sekunder
```css
--secondary: #F3F4F6;
--secondary-foreground: #374151;
--muted: #9CA3AF;
--muted-foreground: #6B7280;
```

#### Warna Semantik
```css
--success: #10B981;      /* Hijau untuk sukses */
--warning: #F59E0B;      /* Kuning untuk peringatan */
--destructive: #EF4444;  /* Merah untuk error */
```

### Mode Gelap (Dark Mode)

#### Warna Primer - Gradien Biru Modern
```css
--primary: #60A5FA;      /* Blue-400 - Utama */
--primary-dark: #4F46E5; /* Indigo-600 - Aksen gelap */
--primary-light: #93C5FD; /* Blue-300 - Aksen terang */
```

#### Warna Netral
```css
--background: #0F172A;   /* Slate-900 */
--foreground: #F1F5F9;   /* Slate-100 */
--surface: #1E293B;      /* Slate-800 */
--surface-strong: #334155; /* Slate-700 */
--border: #334155;       /* Garis tepi */
```

#### Warna Semantik (Optimized for Dark)
```css
--success: #34D399;      /* Hijau terang */
--warning: #FBBF24;      /* Kuning terang */
--destructive: #F87171;  /* Merah terang */
```

### Penggunaan Warna
- **Gradien Primer**: Untuk tombol utama, kartu statistik, dan elemen interaktif penting
- **Surface**: Untuk kartu, panels, dan background konten
- **Muted**: Untuk teks sekunder dan informasi pendukung
- **Semantik**: Untuk status, notifikasi, dan feedback visual

---

## 📐 Tipografi

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Skala Tipografi

#### Display Typography
```css
.text-display {
  font-size: 1.5rem;   /* 24px - mobile */
  font-size: 1.875rem; /* 30px - tablet */
  font-size: 2.25rem;  /* 36px - desktop */
  font-weight: 700;
  line-height: 1.2;
}
```

#### Headlines
```css
.text-headline {
  font-size: 1.25rem;  /* 20px - mobile */
  font-size: 1.5rem;   /* 24px - tablet+ */
  font-weight: 600;
  line-height: 1.3;
}
```

#### Titles
```css
.text-title {
  font-size: 1.125rem; /* 18px - mobile */
  font-size: 1.25rem;  /* 20px - tablet+ */
  font-weight: 500;
  line-height: 1.4;
}
```

#### Body Text
```css
.text-body {
  font-size: 1rem;     /* 16px */
  font-weight: 400;
  line-height: 1.6;
}
```

#### Supporting Text
```css
.text-caption {
  font-size: 0.875rem;  /* 14px */
  font-weight: 400;
  line-height: 1.5;
}
```

#### Labels & Tags
```css
.text-label {
  font-size: 0.75rem;   /* 12px */
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Aturan Penggunaan
1. **Hierarki Jelas**: Gunakan maksimal 3 tingkat ukuran font per halaman
2. **Kontras Baik**: Pastikan kontras warna text minimal 4.5:1
3. **Line Height**: Gunakan line height 1.5-1.6 untuk keterbacaan optimal
4. **Font Weight**: Gunakan weight yang berbeda untuk hierarki, bukan hanya ukuran

---

## ✨ Animasi & Transisi

### Durasi Animasi
```css
--animation-fast: 150ms;     /* Interaksi cepat (klik, hover) */
--animation-normal: 300ms;   /* Transisi halaman, hover kartu */
--animation-slow: 500ms;     /* Animasi kompleks */
```

### Easing Functions
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Natural motion */
--ease-out: cubic-bezier(0, 0, 0.2, 1);      /* Smooth exit */
--ease-in: cubic-bezier(0.4, 0, 1, 1);       /* Quick entry */
```

### Gaya Animasi

#### 1. **Smooth & Gentle** (Halus & Lembut)
- **Penggunaan**: Transisi halaman, hover kartu, perubahan state tidak mendesak
- **Durasi**: 300ms
- **Easing**: ease-out
- **Contoh**: Hover pada kartu statistik

#### 2. **Fast & Responsive** (Cepat & Responsif)
- **Penggunaan**: Interaksi klik, tombol, feedback instan
- **Durasi**: 150ms
- **Easing**: ease-in-out
- **Contoh**: Klik tombol, toggle menu

### Utility Classes Animasi
```css
.transition-smooth { transition: all 300ms ease-out; }
.transition-fast { transition: all 150ms ease-in-out; }
.transition-slow { transition: all 500ms ease-out; }

.hover-lift:hover { transform: translateY(-2px); }
.hover-scale:hover { transform: scale(1.02); }
```

### Micro-interactions
- **Hover Effect**: Subtle lift effect pada kartu dan tombol
- **Loading States**: Smooth skeleton loading
- **State Changes**: Color transitions untuk status changes
- **Focus States**: Smooth ring expansion

---

## 🧱 Komponen UI

### Button Component

#### Variants
```typescript
// Primary - Gradien biru untuk action utama
<Button variant="default" size="lg">
  Create Agent
</Button>

// Secondary - Surface color untuk secondary actions
<Button variant="secondary">
  Cancel
</Button>

// Ghost - Minimal untuk subtle actions
<Button variant="ghost">
  Edit
</Button>

// Destructive - Merah untuk danger actions
<Button variant="destructive">
  Delete
</Button>
```

#### Sizes
```typescript
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>
<Button size="fab">Floating Action</Button>
```

#### Props Interface
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'success' | 'warning'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'fab'
  asChild?: boolean
}
```

### Card Component

#### Struktur Card
```typescript
<Card className="card-shadow">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    Optional footer content
  </CardFooter>
</Card>
```

#### Card Variants
- **Default**: Standard card dengan shadow ringan
- **Borderless**: Card tanpa border untuk seamless design
- **Elevated**: Card dengan shadow lebih tebal untuk emphasis
- **Gradient**: Card dengan background gradien untuk stats cards

### Badge Component

#### Status Badges
```typescript
<Badge variant="success">Active</Badge>
<Badge variant="warning">Training</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="muted">Inactive</Badge>
```

#### Information Badges
```typescript
<Badge variant="secondary">New</Badge>
<Badge variant="outline">Beta</Badge>
<Badge>Default</Badge>
```

### Stats Card Component

#### Usage Example
```typescript
<StatsCard
  title="Total Agents"
  value={24}
  icon={BotIcon}
  description="AI assistants created"
  trend={{
    value: 12,
    isPositive: true
  }}
/>
```

#### Props Interface
```typescript
interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}
```

### Recent Agents Component

#### Basic Usage
```typescript
<RecentAgents
  agents={agentsData}
  loading={isLoading}
  onCreateAgent={handleCreateAgent}
  onAgentClick={handleAgentClick}
/>
```

#### Features
- Loading states dengan skeleton
- Empty state dengan CTA yang jelas
- Agent cards dengan status badges
- Responsive grid layout
- Search dan filter actions

---

## 📱 Pola Responsif

### Breakpoint System
```css
/* Mobile First Approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Layout Patterns

#### 1. Dashboard Grid
```css
/* Mobile: 1 column */
/* Tablet: 2 columns */
/* Desktop: 4 columns */
.stats-grid {
  @apply grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4;
}
```

#### 2. Content Layout
```css
/* Mobile: Stacked */
/* Desktop: Sidebar + Main */
.content-grid {
  @apply grid grid-cols-1 gap-6 lg:grid-cols-3;
}
.content-main { @apply lg:col-span-2; }
.content-sidebar { @apply lg:col-span-1; }
```

#### 3. Navigation Patterns
- **Desktop**: Sidebar navigation dengan logo dan menu vertikal
- **Tablet**: Top navigation dengan hamburger menu
- **Mobile**: Bottom navigation bar + slide-out menu

### Mobile-First Considerations
1. **Touch Targets**: Minimum 44px untuk tombol dan links
2. **Spacing**: Cukup jarak antar elemen untuk避免 accidental taps
3. **Typography**: Text size minimum 16px untuk keterbacaan
4. **Navigation**: Easy thumb reach zone untuk primary actions

---

## 🎯 Figma Design System

### Design Tokens

#### Spacing Scale
```css
--space-1: 0.25rem  /* 4px */
--space-2: 0.5rem   /* 8px */
--space-3: 0.75rem  /* 12px */
--space-4: 1rem     /* 16px */
--space-5: 1.25rem  /* 20px */
--space-6: 1.5rem   /* 24px */
--space-8: 2rem     /* 32px */
--space-10: 2.5rem  /* 40px */
--space-12: 3rem    /* 48px */
--space-16: 4rem    /* 64px */
```

#### Border Radius
```css
--radius-sm: 0.25rem; /* 4px - small elements */
--radius-md: 0.5rem;  /* 8px - cards, buttons */
--radius-lg: 0.75rem; /* 12px - large cards */
--radius-xl: 1rem;    /* 16px - special elements */
--radius-full: 9999px; /* circles */
```

#### Shadow Scale
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### Component Variants

#### Button States
- **Default**: Ready state
- **Hover**: Slightly elevated with color change
- **Active**: Pressed state with scale transform
- **Disabled**: Reduced opacity, no interactions
- **Loading**: Spinner with disabled state

#### Card States
- **Default**: Resting state with subtle shadow
- **Hover**: Elevated shadow with scale transform
- **Active**: Highlighted border/ring
- **Loading**: Skeleton state
- **Empty**: State dengan call-to-action

---

## ♿ Aksesibilitas

### Semantic HTML
```html
<!-- Navigation -->
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard" aria-current="page">Dashboard</a></li>
  </ul>
</nav>

<!-- Main Content -->
<main role="main" aria-label="Dashboard content">
  <section aria-labelledby="stats-heading">
    <h2 id="stats-heading">Statistics Overview</h2>
  </section>
</main>
```

### ARIA Labels
```typescript
// Button dengan aksi yang jelas
<Button aria-label="Create new AI agent">
  <PlusIcon />
  Create Agent
</Button>

// Status badges dengan deskripsi
<Badge
  variant="success"
  role="status"
  aria-label="Agent status: Active"
>
  Active
</Badge>
```

### Keyboard Navigation
- **Tab Order**: Logical tab sequence through interactive elements
- **Focus Styles**: Visible focus indicators dengan ring yang jelas
- **Skip Links**: Hidden links untuk keyboard users
- **Shortcuts**: Keyboard shortcuts untuk power users

### Color Contrast
- **Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Minimum 3:1 contrast ratio
- **State Indicators**: Tidak hanya mengandalkan warna

---

## 🎯 Pattern Library

### Loading States

#### Skeleton Loading
```typescript
<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-10 w-10 rounded-lg" />
```

#### Progress Indicators
```typescript
<Progress value={progress} className="w-full" />
<Spinner size="sm" />
```

### Empty States
- **Illustration**: SVG atau icon yang relevan
- **Clear Message**: Penjelasan singkat mengapa kosong
- **Call-to-Action**: Tombol yang jelas untuk aksi selanjutnya
- **Secondary Actions**: Opsi tambahan jika tersedia

### Error States
- **Clear Error Message**: Penjelasan yang mudah dimengerti
- **Visual Indicator**: Icon atau warna yang menunjukkan error
- **Recovery Actions**: Tombol untuk mencoba lagi atau solusi alternatif
- **Help Links**: Link ke documentation atau support

### Success States
- **Confirmation Message**: Konfirmasi visual dan text
- **Next Steps**: Petunjuk untuk langkah selanjutnya
- **Undo Option**: Jika applicable, berikan opsi undo
- **Celebration**: Subtle animation untuk milestone achievements

---

## 🚀 Performance Guidelines

### Image Optimization
- **Format**: WebP dengan fallback JPEG/PNG
- **Size**: Responsive images dengan srcset
- **Loading**: Lazy loading untuk below-the-fold images
- **Compression**: Optimized compression untuk balance quality/size

### Animation Performance
- **GPU Acceleration**: Gunakan transform dan opacity untuk animasi smooth
- **Reduced Motion**: Respect prefers-reduced-motion setting
- **60 FPS**: Pastikan animasi berjalan di 60fps
- **Will-change**: Gunakan secara bijak untuk complex animations

### Bundle Optimization
- **Tree Shaking**: Import hanya components yang digunakan
- **Code Splitting**: Split berdasarkan routes
- **Dynamic Imports**: Import components saat dibutuhkan
- **Minification**: Minify CSS dan JavaScript

---

## 📋 Implementation Checklist

### Pre-Launch Checklist
- [ ] Semantic HTML structure
- [ ] Color contrast compliance (WCAG AA)
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Responsive design tested
- [ ] Loading states implemented
- [ ] Error handling complete
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Accessibility audit

### Component Review
- [ ] Consistent design tokens
- [ ] Proper TypeScript types
- [ ] Comprehensive props documentation
- [ ] Edge cases handled
- [ ] Loading and error states
- [ ] Accessibility attributes
- [ ] Animation performance
- [ ] Responsive behavior

### Design System Maintenance
- [ ] Component library updated
- [ ] Design tokens documented
- [ ] Usage examples provided
- [ ] Version control implemented
- [ ] Testing coverage adequate
- [ ] Documentation current
- [ ] Migration guides provided

---

## 🔧 Tools & Resources

### Development Tools
- **Storybook**: Component development dan documentation
- **Chrome DevTools**: Performance debugging
- **Axe DevTools**: Accessibility testing
- **Lighthouse**: Performance audit
- **React DevTools**: Component inspection

### Design Tools
- **Figma**: Design system dan UI mockups
- **Contrast Checker**: Color contrast validation
- **Lighthouse**: Performance dan accessibility testing
- **Responsively**: Responsive design testing

### References
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Guidelines](https://material.io/design/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

## 📈 Future Enhancements

### Design System Evolution
1. **Advanced Component Library**: More complex components
2. **Theme System**: Multiple theme options
3. **Icon Library**: Comprehensive icon set
4. **Illustration System**: Custom illustrations
5. **Micro-interactions**: Advanced animation library

### Feature Roadmap
1. **Dark Mode Auto-detect**: System preference detection
2. **Reduced Motion**: Accessibility enhancement
3. **Internationalization**: Multi-language support
4. **Advanced Analytics**: User behavior tracking
5. **A/B Testing**: Design iteration framework

---

*Last Updated: November 2024*
*Version: 1.0.0*
*Maintained by: Clevio AI Team*