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
      {/* Stunning Geometric Header Backdrop */}
      <View 
        style={{ shadowColor: '#134e4a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}
        className="absolute top-0 left-0 right-0 h-48 bg-[#0F766E] z-0 overflow-hidden">
         <View className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-teal-400/20" />
         <View className="absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-teal-900/30" />
      </View>

      <View className="flex-row items-center justify-between px-5 pt-4 pb-4 z-10">
        <TouchableOpacity
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
          activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text className="text-[16px] font-black tracking-widest uppercase text-white mr-2">
          Profile
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
        className="z-10">
        
        {/* Profile Card & Avatar Wrapper */}
        <View className="mx-5 z-20">
          {/* Avatar breaking out (rendered as sibling to prevent Android elevation clipping) */}
          <View className="items-center z-30" style={{ elevation: 10, marginBottom: -64 }}>
            <View className="rounded-full bg-white dark:bg-slate-900 p-2" style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 6 }}>
              <Image source={{ uri: official.avatar }} className="h-28 w-28 rounded-full" />
            </View>
          </View>

          {/* Elevated Card Background */}
          <View 
            style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 }}
            className="rounded-[32px] border border-slate-100 bg-white px-6 pb-6 pt-[72px] dark:border-slate-800/80 dark:bg-slate-900">
            <View className="items-center mb-5">
              <Text className="text-[24px] font-black text-slate-800 dark:text-slate-100 text-center leading-tight">
                {official.name}
              </Text>
              <View className="mt-2.5 rounded-xl px-4 py-1.5 border" style={{ backgroundColor: roleCfg.bg, borderColor: roleCfg.color + '40' }}>
                <Text style={{ color: roleCfg.color }} className="text-[11px] font-black uppercase tracking-widest">
                  {roleCfg.label}
                </Text>
              </View>
            </View>

          <View className="gap-4 border-t border-slate-100/60 pt-5 dark:border-slate-800/60">
            <View className="flex-row items-center gap-4">
              <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <Briefcase size={18} color="#0891B2" strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Designation</Text>
                <Text className="text-[15px] font-black text-slate-700 dark:text-slate-300 mt-0.5">
                  {official.designation}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-4">
              <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <Building2 size={18} color="#0891B2" strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</Text>
                <Text className="text-[15px] font-black text-slate-700 dark:text-slate-300 mt-0.5">
                  {official.department}
                </Text>
              </View>
            </View>
            {official.city && (
              <View className="flex-row items-center gap-4">
                <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                  <MapPin size={18} color="#0891B2" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">City</Text>
                  <Text className="text-[15px] font-black text-slate-700 dark:text-slate-300 mt-0.5">
                    {official.city}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
        </View>

        {/* Assigned Issues */}
        {relatedIssues.length > 0 && (
          <View className="mx-5 mt-8">
            <Text className="mb-4 ml-2 text-[12px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Assigned Issues ({relatedIssues.length})
            </Text>
            <View className="gap-3">
              {relatedIssues.map((issue) => {
                const statusColor = STATUS_COLORS[issue.status] ?? '#94A3B8';
                return (
                  <View
                    key={issue.id}
                    style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                    className="rounded-[20px] border border-slate-100 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
                    <View className="mb-2 flex-row items-start justify-between">
                      <Text className="text-[11px] font-black uppercase tracking-widest text-[#0F766E] dark:text-teal-400">
                        {issue.id}
                      </Text>
                      <View
                        style={{ backgroundColor: statusColor + '15', borderColor: statusColor + '30' }}
                        className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1">
                        <View
                          style={{ backgroundColor: statusColor }}
                          className="h-2 w-2 rounded-full"
                        />
                        <Text style={{ color: statusColor }} className="text-[10px] font-black uppercase tracking-wider">
                          {issue.status}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="text-[15px] font-black text-slate-800 dark:text-slate-100 leading-tight mb-3"
                      numberOfLines={2}>
                      {issue.title}
                    </Text>
                    <View className="flex-row items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/50">
                      <MapPin size={14} color="#64748B" strokeWidth={2.5} />
                      <Text
                        className="flex-1 text-[12px] font-bold text-slate-600 dark:text-slate-400"
                        numberOfLines={1}>
                        {issue.location}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Start Conversation */}
        <View className="mx-5 mt-8">
          <Text className="mb-4 ml-2 text-[12px] font-black uppercase tracking-widest text-[#0F766E] dark:text-teal-400">
            Start Conversation
          </Text>

          {selectedIssue && (
            <View className="mb-4 flex-row items-center gap-3 rounded-[20px] border border-teal-200/60 bg-teal-50 px-4 py-3.5 dark:border-slate-700/80 dark:bg-slate-900">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-teal-100 dark:bg-slate-800">
                <Tag size={14} color="#0F766E" strokeWidth={2.5} className="dark:text-teal-400" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-500 mb-0.5">
                  {selectedIssue.id}
                </Text>
                <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-200" numberOfLines={1}>
                  {selectedIssue.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedIssue(null)}
                className="h-8 w-8 items-center justify-center rounded-full bg-teal-200/50 dark:bg-slate-800"
                activeOpacity={0.7}>
                <X size={14} color="#0F766E" strokeWidth={3} className="dark:text-slate-400" />
              </TouchableOpacity>
            </View>
          )}

          <View 
            style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
            className="overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-900">
            <TextInput
              className="min-h-[120px] px-5 pb-4 pt-5 text-[15px] font-medium text-slate-800 dark:text-slate-200"
              placeholder={`Send a message to ${official.name.split(' ')[0]}...`}
              placeholderTextColor="#94A3B8"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
            <View className="flex-row items-center justify-between border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800/80">
              <TouchableOpacity
                onPress={() => setShowIssuePicker(true)}
                className="flex-row items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 border border-slate-100 dark:border-slate-700 dark:bg-slate-800"
                activeOpacity={0.7}>
                <Tag size={14} color="#64748B" strokeWidth={2.5} />
                <Text className="text-[12px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                  {selectedIssue ? 'Change Issue' : 'Link Issue'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSend}
                disabled={!message.trim()}
                activeOpacity={0.8}
                style={message.trim() ? { shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 } : {}}
                className={`flex-row items-center gap-2 rounded-[16px] px-6 py-3 ${message.trim() ? 'bg-[#0F766E]' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <MessageSquarePlus
                  size={16}
                  color={message.trim() ? '#FFFFFF' : '#94A3B8'}
                  strokeWidth={2.5}
                />
                <Text
                  className={`text-[13px] font-black uppercase tracking-widest ${message.trim() ? 'text-white' : 'text-slate-400'}`}>
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
