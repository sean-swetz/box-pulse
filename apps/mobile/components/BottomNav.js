import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Home, CheckCircle, BookOpen, MessageCircle, User } from 'lucide-react-native';

const LEFT_TABS = [
  { name: 'Home', path: '/(app)/dashboard', icon: Home },
  { name: 'Recipes', path: '/(app)/recipes', icon: BookOpen },
];

const RIGHT_TABS = [
  { name: 'Chat', path: '/(app)/chat', icon: MessageCircle },
  { name: 'Profile', path: '/(app)/profile', icon: User },
];

const BAR_HEIGHT = 72;
const FAB_SIZE = 86;
const FAB_LIFT = -18; // px the FAB center rises above the bar top (negative = sinks into bar)

export default function BottomNav() {
  const pathname = usePathname();
  const isCheckinActive = pathname === '/(app)/checkin';

  const renderTab = (tab) => {
    const isActive = pathname === tab.path;
    const Icon = tab.icon;
    return (
      <TouchableOpacity
        key={tab.path}
        onPress={() => router.navigate(tab.path)}
        style={styles.tab}
      >
        <Icon size={22} color={isActive ? '#0df259' : '#94a3b8'} strokeWidth={2} />
        <Text style={[styles.label, isActive && styles.labelActive]}>{tab.name}</Text>
        {isActive && <View style={styles.activeBar} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* FAB — absolutely positioned above the bar */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => router.navigate('/(app)/checkin')}
          style={[styles.fab, isCheckinActive && styles.fabActiveGlow]}
          activeOpacity={0.85}
        >
          <CheckCircle size={30} color="#102216" strokeWidth={2.5} />
          <Text style={styles.fabLabel}>Check In</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.bar}>
        {LEFT_TABS.map(renderTab)}
        <View style={styles.spacer} />
        {RIGHT_TABS.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Negative top: rises FAB center FAB_LIFT px above the bar top edge
    top: -(FAB_SIZE / 2 + FAB_LIFT),
    alignItems: 'center',
    zIndex: 20,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#0df259',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#0a1a0d',
    shadowColor: '#0df259',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  fabActiveGlow: {
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  fabLabel: {
    color: '#102216',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#131f16',
    borderTopWidth: 1,
    borderTopColor: '#1e3322',
    height: BAR_HEIGHT,
    paddingBottom: 16,
    paddingHorizontal: 8,
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    paddingTop: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  labelActive: {
    color: '#0df259',
  },
  activeBar: {
    position: 'absolute',
    bottom: 0,
    width: 28,
    height: 2,
    backgroundColor: '#0df259',
    borderRadius: 2,
  },
  spacer: {
    flex: 1.2,
  },
});
