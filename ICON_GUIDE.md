# 🎨 Icon Reference Guide

All icons use **Lucide React Native** - professional, consistent, customizable.

## Installation

```bash
npm install lucide-react-native react-native-svg
```

## Usage

```javascript
import { Home, MessageCircle } from 'lucide-react-native';

<Home size={24} color="#0df259" strokeWidth={2} />
```

---

## Current Icon Mapping

### **Navigation (Bottom Nav)**
- Dashboard → `<Home />`
- Check-in → `<CheckCircle />`
- Leaderboard → `<Trophy />`
- Chat → `<MessageCircle />`
- Coach → `<GraduationCap />`

### **Actions**
- Back → `<ArrowLeft />`
- View Details → `<Eye />`
- Message Team → `<MessageCircle />`
- Upload Image → `<Upload />`
- Take Photo → `<Camera />`
- Search → `<Search />`
- Filter → `<SlidersHorizontal />`
- Settings → `<Settings />`
- Add New → `<Plus />`
- Delete → `<Trash2 />`
- Edit → `<Pencil />`
- Close → `<X />`

### **Stats & Progress**
- Points → `<TrendingUp />`
- Rank → `<Award />`
- Team → `<Users />`
- Calendar → `<Calendar />`
- Chart → `<BarChart3 />`

### **Social**
- Like → `<ThumbsUp />`
- Heart → `<Heart />`
- Share → `<Share2 />`
- Comment → `<MessageSquare />`

### **Media**
- GIF → `<ImagePlay />`
- Emoji → `<Smile />`
- Attach → `<Paperclip />`
- Send → `<Send />`

### **Fitness**
- Workout → `<Dumbbell />`
- Food → `<UtensilsCrossed />`
- Water → `<Droplet />`
- Sleep → `<Moon />`

### **Status**
- Check (completed) → `<Check />`
- Warning → `<AlertTriangle />`
- Error → `<XCircle />`
- Info → `<Info />`
- Loading → `<Loader2 className="animate-spin" />`

---

## Icon Customization

### **Size:**
```javascript
<Home size={16} />  // Small
<Home size={24} />  // Default
<Home size={32} />  // Large
```

### **Color:**
```javascript
<Home color="#0df259" />      // Primary green
<Home color="#ffffff" />      // White
<Home color="#94a3b8" />      // Slate-400 (inactive)
```

### **Stroke Width:**
```javascript
<Home strokeWidth={1.5} />  // Thin
<Home strokeWidth={2} />    // Default
<Home strokeWidth={2.5} />  // Bold
```

---

## Common Patterns

### **Active/Inactive States:**
```javascript
const Icon = tab.icon;
<Icon 
  size={24} 
  color={isActive ? '#0df259' : '#94a3b8'}
  strokeWidth={2}
/>
```

### **Button with Icon:**
```javascript
<TouchableOpacity className="flex-row items-center space-x-2">
  <MessageCircle size={18} color="#0df259" />
  <Text className="text-primary font-bold">Message</Text>
</TouchableOpacity>
```

### **Icon Only Button:**
```javascript
<TouchableOpacity className="p-2 bg-slate-700 rounded-lg">
  <Settings size={20} color="#ffffff" />
</TouchableOpacity>
```

---

## Full Icon List

Browse all 1000+ icons: https://lucide.dev/icons/

Common categories:
- **Arrows:** ArrowLeft, ArrowRight, ChevronDown, etc.
- **Actions:** Edit, Delete, Save, Copy, etc.
- **Social:** Users, UserPlus, Heart, Share, etc.
- **Media:** Image, Video, Music, Camera, etc.
- **Files:** File, Folder, FileText, Download, etc.
- **UI:** Menu, X, Check, Plus, Minus, etc.

---

## Migration Checklist

- [x] Login screen logo → Dumbbell
- [x] Bottom nav icons → Home, CheckCircle, Trophy, MessageCircle, GraduationCap
- [x] Coach dashboard buttons → MessageCircle, Eye
- [x] Team detail → ArrowLeft, MessageCircle
- [ ] Dashboard screen (when built)
- [ ] Check-in form (when built)
- [ ] Leaderboard (when built)
- [ ] Chat screens (when built)
- [ ] Profile screen (when built)

---

Ready to use! 🎨
