import {
  Flame,
  Heart,
  MessageCircle,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Languages,
  Search,
  Quote,
  ClipboardList,
  Sparkles,
  PartyPopper,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronLeft,
  ChevronRight,
  Settings,
  Camera,
  MapPin,
  Calendar,
  Loader2,
} from 'lucide-react';

/** Lucide outline icons — consistent stroke, dating-app friendly tone. */
const ICONS = {
  discover: Flame,
  likes: Heart,
  messages: MessageCircle,
  profile: User,
  mail: Mail,
  lock: Lock,
  eye: Eye,
  eyeOff: EyeOff,
  languages: Languages,
  search: Search,
  quote: Quote,
  list: ClipboardList,
  sparkles: Sparkles,
  celebrate: PartyPopper,
  alert: AlertCircle,
  success: CheckCircle2,
  info: Info,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  settings: Settings,
  camera: Camera,
  mapPin: MapPin,
  calendar: Calendar,
  loader: Loader2,
};

const SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * @param {keyof typeof ICONS} name
 * @param {'sm'|'md'|'lg'|'xl'} [size='md']
 * @param {'default'|'muted'|'active'|'onPrimary'|'danger'|'success'} [tone='default']
 */
export default function Icon({
  name,
  size = 'md',
  tone = 'default',
  className = '',
  strokeWidth,
  ...props
}) {
  const Comp = ICONS[name];
  if (!Comp) return null;

  const px = typeof size === 'number' ? size : SIZES[size] ?? SIZES.md;

  return (
    <Comp
      size={px}
      strokeWidth={strokeWidth ?? 1.75}
      className={`ui-icon ui-icon--${tone} ${className}`.trim()}
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    />
  );
}

export { ICONS };
