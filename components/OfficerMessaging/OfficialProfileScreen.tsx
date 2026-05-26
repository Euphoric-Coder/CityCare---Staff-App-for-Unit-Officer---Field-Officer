import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MessageSquarePlus,
  Tag,
  Briefcase,
  Building2,
  MapPin,
  CircleCheck as CheckCircle,
  X,
} from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from 'context/UserContext';
import { Issue, OfficialUser } from 'lib/types';
import IssuePickerSheet from './IssuePickerSheet';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Admin: { label: 'Admin', color: '#DC2626', bg: '#FEF2F2' },
  CityAdmin: { label: 'City Admin', color: '#7C3AED', bg: '#F5F3FF' },
  UnitOfficer: { label: 'Unit Officer', color: '#0891B2', bg: '#E0F2FE' },
  FieldOfficer: { label: 'Field Officer', color: '#059669', bg: '#D1FAE5' },
};

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

interface Props {
  official: OfficialUser;
  onBack: () => void;
  onStartConversation: (official: OfficialUser, message: string, issueRef?: Issue) => void;
}

export default function OfficialProfileScreen({ official, onBack, onStartConversation }: Props) {
  const user = useUser();
  const [message, setMessage] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showIssuePicker, setShowIssuePicker] = useState(false);

  const roleCfg = ROLE_CONFIG[official.role] ?? ROLE_CONFIG.FieldOfficer;

  // Fetch real issues assigned to this official
  const rawIssues = useQuery(api.issues.getIssuesByOfficial, { officialId: official.id as any }) || [];

  const relatedIssues = rawIssues.map((i) => ({
    ...i,
    id: i.issueCode || (i._id as string),
    location: i.address || i.city,
    title: i.title,
    status: i.status,
  })) as any as Issue[];

  const handleSend = () => {
    if (!message.trim()) return;
    onStartConversation(official, message.trim(), selectedIssue ?? undefined);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <TouchableOpacity
          onPress={onBack}
          className="h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800"
          activeOpacity={0.7}>
          <ArrowLeft size={18} color="#64748B" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text className="flex-1 text-base font-extrabold text-slate-800 dark:text-slate-100">
          Official Profile
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mx-4 mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <View className="mb-4 items-center">
            <View className="relative mb-3">
              <Image source={{ uri: official.avatar }} className="h-24 w-24 rounded-full" />
            </View>
            <Text className="mb-1 text-xl font-extrabold text-slate-900 dark:text-slate-50">
              {official.name}
            </Text>
            <View style={{ backgroundColor: roleCfg.bg }} className="mb-2 rounded-lg px-3 py-1">
              <Text style={{ color: roleCfg.color }} className="text-sm font-bold">
                {roleCfg.label}
              </Text>
            </View>
          </View>

          <View className="gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
                <Briefcase size={15} color="#0891B2" strokeWidth={2.5} />
              </View>
              <View>
                <Text className="text-xs text-slate-400 dark:text-slate-500">Designation</Text>
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {official.designation}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
                <Building2 size={15} color="#0891B2" strokeWidth={2.5} />
              </View>
              <View>
                <Text className="text-xs text-slate-400 dark:text-slate-500">Department</Text>
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {official.department}
                </Text>
              </View>
            </View>
            {official.city && (
              <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
                  <MapPin size={15} color="#0891B2" strokeWidth={2.5} />
                </View>
                <View>
                  <Text className="text-xs text-slate-400 dark:text-slate-500">City</Text>
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {official.city}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {relatedIssues.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Assigned Issues
            </Text>
            <View className="gap-2">
              {relatedIssues.map((issue) => {
                const statusColor = STATUS_COLORS[issue.status] ?? '#94A3B8';
                return (
                  <View
                    key={issue.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <View className="mb-1 flex-row items-start justify-between">
                      <Text className="text-xs font-bold text-sky-600 dark:text-sky-400">
                        {issue.id}
                      </Text>
                      <View
                        style={{ backgroundColor: statusColor + '15' }}
                        className="flex-row items-center gap-1 rounded-full px-2 py-0.5">
                        <View
                          style={{ backgroundColor: statusColor }}
                          className="h-1.5 w-1.5 rounded-full"
                        />
                        <Text style={{ color: statusColor }} className="text-xs font-semibold">
                          {issue.status}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="text-sm font-semibold text-slate-800 dark:text-slate-100"
                      numberOfLines={1}>
                      {issue.title}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs text-slate-500 dark:text-slate-400"
                      numberOfLines={1}>
                      📍 {issue.location}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View className="mx-4 mt-5">
          <Text className="mb-3 ml-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Start Conversation
          </Text>

          {selectedIssue && (
            <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-800 dark:bg-sky-900/20">
              <Tag size={14} color="#0891B2" strokeWidth={2.5} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-sky-700 dark:text-sky-300">
                  {selectedIssue.id}
                </Text>
                <Text className="text-xs text-sky-600 dark:text-sky-400" numberOfLines={1}>
                  {selectedIssue.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedIssue(null)}
                className="h-6 w-6 items-center justify-center rounded-full bg-sky-200 dark:bg-sky-800"
                activeOpacity={0.7}>
                <X size={12} color="#0891B2" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}

          <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <TextInput
              className="min-h-[100px] px-4 pb-3 pt-4 text-sm text-slate-800 dark:text-slate-200"
              placeholder={`Send a message to ${official.name.split(' ')[0]}...`}
              placeholderTextColor="#94A3B8"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
            <View className="flex-row items-center justify-between border-t border-slate-100 px-4 pb-3 pt-2 dark:border-slate-800">
              <TouchableOpacity
                onPress={() => setShowIssuePicker(true)}
                className="flex-row items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 dark:bg-sky-900/30"
                activeOpacity={0.7}>
                <Tag size={13} color="#0891B2" strokeWidth={2.5} />
                <Text className="text-xs font-bold text-sky-700 dark:text-sky-300">
                  {selectedIssue ? 'Change Issue' : 'Link Issue'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSend}
                disabled={!message.trim()}
                activeOpacity={0.8}
                className={`flex-row items-center gap-2 rounded-xl px-5 py-2.5 ${message.trim() ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <MessageSquarePlus
                  size={15}
                  color={message.trim() ? '#FFFFFF' : '#94A3B8'}
                  strokeWidth={2.5}
                />
                <Text
                  className={`text-sm font-bold ${message.trim() ? 'text-white' : 'text-slate-400'}`}>
                  Start Chat
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <IssuePickerSheet
        visible={showIssuePicker}
        onClose={() => setShowIssuePicker(false)}
        onSelect={(issue) => {
          setSelectedIssue(issue);
          setShowIssuePicker(false);
        }}
      />
    </SafeAreaView>
  );
}
