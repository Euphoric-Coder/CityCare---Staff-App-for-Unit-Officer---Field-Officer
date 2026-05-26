import React, { useState, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Search, X, Tag, ChevronRight, ListFilter as Filter } from 'lucide-react-native';
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
      <View className="flex-1 justify-end bg-black/50">
        <View className="rounded-t-3xl bg-white dark:bg-slate-900" style={{ maxHeight: '85%' }}>
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 pb-3 pt-5 dark:border-slate-800">
            <View className="flex-row items-center gap-2">
              <Tag size={16} color="#0891B2" strokeWidth={2.5} />
              <Text className="text-base font-bold text-slate-800 dark:text-slate-100">
                Reference an Issue
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              activeOpacity={0.7}>
              <X size={16} color="#64748B" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View className="gap-2 px-4 pb-2 pt-3">
            <View className="flex-row items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
              <Search size={16} color="#94A3B8" strokeWidth={2.5} />
              <TextInput
                className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200"
                placeholder="Search by ID, title, location..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <X size={14} color="#94A3B8" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              className="flex-row items-center gap-1.5 self-start"
              activeOpacity={0.7}>
              <Filter size={14} color={hasFilters ? '#0891B2' : '#94A3B8'} strokeWidth={2.5} />
              <Text
                className={`text-xs font-semibold ${hasFilters ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {hasFilters ? 'Filters active' : 'Filter by category'}
              </Text>
              {hasFilters && (
                <TouchableOpacity onPress={handleClearFilters} className="ml-1" activeOpacity={0.7}>
                  <Text className="text-xs font-bold text-red-500">Clear</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {showFilters && (
              <View className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                        className={`rounded-full border px-3 py-1.5 ${
                          selectedCategory === cat
                            ? 'border-sky-600 bg-sky-600'
                            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                        }`}>
                        <Text
                          className={`text-xs font-semibold ${
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

                {selectedCategory && subCategories.length > 0 && (
                  <>
                    <Text className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                            className={`rounded-full border px-3 py-1.5 ${
                              selectedSubCategory === sc
                                ? 'border-teal-600 bg-teal-600'
                                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                            }`}>
                            <Text
                              className={`text-xs font-semibold ${
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
                  </>
                )}
              </View>
            )}
          </View>

          <View className="px-4 pb-1">
            <Text className="text-xs text-slate-400 dark:text-slate-500">
              {filtered.length} issue{filtered.length !== 1 ? 's' : ''} found
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 36, gap: 8 }}>
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
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <View className="mb-1.5 flex-row items-start justify-between">
                    <View className="mr-3 flex-1">
                      <Text className="mb-0.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                        {issue.id}
                      </Text>
                      <Text
                        className="text-sm font-bold text-slate-800 dark:text-slate-100"
                        numberOfLines={2}>
                        {issue.title}
                      </Text>
                    </View>
                    <View
                      style={{ backgroundColor: priorityColor + '20' }}
                      className="rounded-lg px-2 py-0.5">
                      <Text style={{ color: priorityColor }} className="text-xs font-bold">
                        {issue.priority}
                      </Text>
                    </View>
                  </View>

                  <View className="mb-2 flex-row flex-wrap gap-2">
                    <View
                      style={{ backgroundColor: statusColor + '15' }}
                      className="flex-row items-center gap-1 rounded-full px-2.5 py-0.5">
                      <View
                        style={{ backgroundColor: statusColor }}
                        className="h-1.5 w-1.5 rounded-full"
                      />
                      <Text style={{ color: statusColor }} className="text-xs font-semibold">
                        {issue.status}
                      </Text>
                    </View>
                    <View className="rounded-full bg-slate-200 px-2.5 py-0.5 dark:bg-slate-700">
                      <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {issue.category}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                    📍 {issue.location}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {filtered.length === 0 && (
              <View className="items-center justify-center gap-2 py-12">
                <Tag size={40} color="#CBD5E1" strokeWidth={1.5} />
                <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  No issues found
                </Text>
                <Text className="px-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  Try adjusting your search or clear the filters
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
