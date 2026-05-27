import React, { useState, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, X, Tag, ListFilter as Filter, MapPin } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from 'context/UserContext';
import { Issue, IssueCategory } from 'lib/types';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  Verified: '#3B82F6',
  Assigned: '#6366F1',
  'In Progress': '#0EA5E9',
  'Pending UO Verification': '#A855F7',
  'Rework Required': '#F97316',
  Closed: '#10B981',
  Rejected: '#EF4444',
  Reopened: '#EC4899',
  Escalated: '#8B5CF6',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#22C55E',
  Medium: '#F59E0B',
  High: '#F97316',
  Critical: '#EF4444',
};

const CATEGORIES: IssueCategory[] = [
  'Pothole',
  'Street Light',
  'Waste Management',
  'Water Supply',
  'Drainage',
  'Road Repair',
  'Park Maintenance',
  'Public Safety',
];

const SUB_CATEGORIES: Record<IssueCategory, string[]> = {
  Pothole: ['Minor Pothole', 'Major Pothole', 'Road Cave-in'],
  'Street Light': ['Street Light Out', 'Flickering Light', 'Damaged Pole'],
  'Waste Management': ['Garbage Overflow', 'Illegal Dumping'],
  'Water Supply': ['Water Leakage', 'No Water Supply'],
  Drainage: ['Drain Overflow', 'Blocked Drain'],
  'Road Repair': ['Footpath Damage', 'Median Damage'],
  'Park Maintenance': ['Equipment Broken', 'Tree Fallen'],
  'Public Safety': ['Noise Complaint', 'Encroachment'],
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (issue: Issue) => void;
}

export default function IssuePickerSheet({ visible, onClose, onSelect }: Props) {
  const user = useUser();
  const rawIssues = useQuery(api.issues.getIssuesByOfficial, { officialId: user?.id as any }) || [];

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const subCategories = selectedCategory ? (SUB_CATEGORIES[selectedCategory] ?? []) : [];

  const filtered = useMemo(() => {
    return rawIssues
      .filter((issue) => {
        const q = search.toLowerCase();
        const issueIdStr = issue.issueCode || (issue._id as string);
        const matchesSearch =
          !q ||
          issueIdStr.toLowerCase().includes(q) ||
          issue.title.toLowerCase().includes(q) ||
          (issue.address || issue.city || '').toLowerCase().includes(q) ||
          issue.category.toLowerCase().includes(q);
        const matchesCat = !selectedCategory || issue.category === selectedCategory;
        const matchesSub = !selectedSubCategory || issue.subcategory?.includes(selectedSubCategory);
        return matchesSearch && matchesCat && matchesSub;
      })
      .map((i) => ({
        ...i,
        id: i.issueCode || (i._id as string),
        location: i.address || i.city,
        subCategories: i.subcategory || [],
      })) as any as Issue[];
  }, [search, selectedCategory, selectedSubCategory, rawIssues]);

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
  };

  const hasFilters = selectedCategory || selectedSubCategory;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-900/60 backdrop-blur-md">
        <View className="h-[85%] rounded-t-[36px] bg-slate-50 dark:bg-slate-950 overflow-hidden">
          
          {/* Stunning Header Section */}
          <View 
            style={{ shadowColor: '#134e4a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}
            className="absolute top-0 left-0 right-0 h-36 bg-[#0F766E] z-0">
             <View className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-teal-400/20" />
             <View className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-teal-900/30" />
          </View>

          <View className="flex-row items-center justify-between px-6 pt-6 pb-5 z-10">
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-white/20 border border-white/30" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                <Tag size={20} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mb-0.5">Select Context</Text>
                <Text className="text-[20px] font-black tracking-tight text-white" numberOfLines={1}>
                  Reference Issue
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
              activeOpacity={0.7}>
              <X size={18} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          {/* Content Body */}
          <View className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-t-[32px] overflow-hidden z-10 border-t border-white/20">
            <View className="px-5 pt-6 pb-2">
              {/* Search Bar */}
              <View 
                style={{ shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 }}
                className="flex-row items-center gap-3 rounded-[20px] bg-white px-4 py-3.5 border border-slate-100 dark:border-slate-800 dark:bg-slate-900/80">
                <Search size={18} color="#94A3B8" strokeWidth={2.5} />
                <TextInput
                  className="flex-1 text-[15px] font-bold text-slate-800 dark:text-slate-200 p-0"
                  placeholder="Search by ID, title, location..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} className="h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <X size={12} color="#64748B" strokeWidth={3} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filters Toggle */}
              <TouchableOpacity
                onPress={() => setShowFilters(!showFilters)}
                className="mt-5 flex-row items-center justify-between"
                activeOpacity={0.7}>
                <View className="flex-row items-center gap-3">
                  <View className={`h-8 w-8 items-center justify-center rounded-full ${hasFilters ? 'bg-teal-100 dark:bg-teal-900/40' : 'bg-slate-200/80 dark:bg-slate-800'}`}>
                    <Filter size={14} color={hasFilters ? '#0F766E' : '#64748B'} strokeWidth={2.5} />
                  </View>
                  <Text className={`text-[13px] font-black ${hasFilters ? 'text-teal-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {hasFilters ? 'Filters active' : 'Filter by category'}
                  </Text>
                </View>
                {hasFilters && (
                  <TouchableOpacity onPress={handleClearFilters} activeOpacity={0.7} className="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Clear</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Expanded Filters */}
              {showFilters && (
                <View className="mt-4 gap-4 rounded-[24px] bg-slate-100/50 p-5 border border-slate-200/50 dark:border-slate-800/60 dark:bg-slate-800/30">
                  <View>
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Category
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                      <View className="flex-row gap-2 px-1">
                        {CATEGORIES.map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => {
                              setSelectedCategory(selectedCategory === cat ? null : cat);
                              setSelectedSubCategory(null);
                            }}
                            activeOpacity={0.7}
                            className={`rounded-[14px] border px-4 py-2.5 ${
                              selectedCategory === cat
                                ? 'border-[#0F766E] bg-[#0F766E]'
                                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                            }`}>
                            <Text
                              className={`text-[12px] font-bold ${
                                selectedCategory === cat
                                  ? 'text-white'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {selectedCategory && subCategories.length > 0 && (
                    <View>
                      <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Sub-category
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                        <View className="flex-row gap-2 px-1">
                          {subCategories.map((sc) => (
                            <TouchableOpacity
                              key={sc}
                              onPress={() =>
                                setSelectedSubCategory(selectedSubCategory === sc ? null : sc)
                              }
                              activeOpacity={0.7}
                              className={`rounded-[14px] border px-4 py-2.5 ${
                                selectedSubCategory === sc
                                  ? 'border-teal-600 bg-teal-600'
                                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                              }`}>
                              <Text
                                className={`text-[12px] font-bold ${
                                  selectedSubCategory === sc
                                    ? 'text-white'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}>
                                {sc}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View className="px-5 pt-3 pb-2 flex-row items-center justify-between border-b border-slate-200/50 dark:border-slate-800">
              <Text className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Available Issues
              </Text>
              <View className="h-6 w-6 rounded-full bg-slate-200/60 dark:bg-slate-800 items-center justify-center">
                <Text className="text-[10px] font-black text-slate-500">{filtered.length}</Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 40, gap: 12 }}>
              {filtered.map((issue) => {
                const statusColor = STATUS_COLORS[issue.status] ?? '#94A3B8';
                const priorityColor = PRIORITY_COLORS[issue.priority] ?? '#94A3B8';
                return (
                  <TouchableOpacity
                    key={issue.id}
                    onPress={() => {
                      onSelect(issue);
                      onClose();
                    }}
                    activeOpacity={0.75}
                    style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    className="rounded-[24px] border border-slate-100 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-900">
                    <View className="mb-3 flex-row items-start justify-between">
                      <View className="mr-3 flex-1">
                        <Text className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-[#0F766E] dark:text-teal-400">
                          {issue.id}
                        </Text>
                        <Text
                          className="text-[16px] font-black text-slate-800 dark:text-slate-100 leading-tight"
                          numberOfLines={2}>
                          {issue.title}
                        </Text>
                      </View>
                      <View
                        style={{ backgroundColor: priorityColor + '15', borderColor: priorityColor + '30' }}
                        className="rounded-xl border px-3 py-1.5 items-center justify-center">
                        <Text style={{ color: priorityColor }} className="text-[10px] font-black uppercase tracking-wider">
                          {issue.priority}
                        </Text>
                      </View>
                    </View>

                    <View className="mb-4 flex-row flex-wrap gap-2">
                      <View
                        style={{ backgroundColor: statusColor + '15', borderColor: statusColor + '30' }}
                        className="flex-row items-center gap-2 rounded-full border px-3 py-1.5">
                        <View
                          style={{ backgroundColor: statusColor }}
                          className="h-2 w-2 rounded-full"
                        />
                        <Text style={{ color: statusColor }} className="text-[10px] font-extrabold uppercase tracking-wider">
                          {issue.status}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-3 py-1.5 dark:border-slate-700/60 dark:bg-slate-800/50">
                        <Tag size={10} color="#64748B" strokeWidth={2.5} />
                        <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {issue.category}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-2 bg-slate-50 rounded-xl p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <MapPin size={14} color="#0F766E" strokeWidth={2.5} />
                      <Text className="flex-1 text-[12px] font-semibold text-slate-600 dark:text-slate-400" numberOfLines={1}>
                        {issue.location}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filtered.length === 0 && (
                <View className="items-center justify-center gap-3 py-16">
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Tag size={32} color="#CBD5E1" strokeWidth={2} />
                  </View>
                  <Text className="text-[16px] font-black text-slate-800 dark:text-slate-200">
                    No issues found
                  </Text>
                  <Text className="px-8 text-center text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    Try adjusting your search terms or clear your active filters.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}
