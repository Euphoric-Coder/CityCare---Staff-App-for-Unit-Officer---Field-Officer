import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, Image } from 'react-native';
import {
  X,
  MapPin,
  Calendar,
  User,
  Tag,
  TriangleAlert as AlertTriangle,
  Clock,
  Briefcase,
  Layers,
  Activity,
  MessageSquare,
} from 'lucide-react-native';
import { Issue } from 'lib/types';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

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

interface Props {
  issueId: string | null;
  onClose: () => void;
}

export default function IssueRefModal({ issueId, onClose }: Props) {
  const issueData = useQuery(api.issues.getIssueById, issueId ? { issueId: issueId as any } : 'skip');

  if (!issueId || !issueData) return null;

  const issue = {
    ...issueData,
    id: issueData.issueCode || (issueData._id as string),
    location: issueData.address || issueData.city,
    subCategories: issueData.subcategory || [],
    dateReported: issueData.createdAt,
    images: issueData.photoUrl || [],
    assignedOfficer: issueData.assignedFieldOfficer || issueData.assignedUnitOfficer || null,
  } as any as Issue;

  const statusColor = STATUS_COLORS[issue.status] ?? '#94A3B8';
  const priorityColor = PRIORITY_COLORS[issue.priority] ?? '#94A3B8';
  const lastUpdate = issue.issueUpdates?.[issue.issueUpdates.length - 1];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
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
                <Layers size={20} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-teal-100 uppercase tracking-widest mb-0.5">Reference Data</Text>
                <Text className="text-[20px] font-black tracking-tight text-white" numberOfLines={1}>
                  Issue Details
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
          <View className="flex-1 bg-white dark:bg-slate-900 rounded-t-[32px] overflow-hidden z-10 shadow-inner">
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
              
              <View className="mb-6 flex-row items-start justify-between">
                <View className="mr-4 flex-1">
                  <Text className="mb-1 text-[13px] font-black uppercase tracking-widest text-[#0F766E] dark:text-teal-400">
                    {issue.id}
                  </Text>
                  <Text className="text-[24px] font-black leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                    {issue.title}
                  </Text>
                </View>
                <View
                  style={{ backgroundColor: priorityColor + '15', borderColor: priorityColor + '30' }}
                  className="rounded-xl border px-3 py-2 items-center justify-center">
                  <Activity size={14} color={priorityColor} strokeWidth={3} className="mb-1" />
                  <Text style={{ color: priorityColor }} className="text-[10px] font-black uppercase tracking-wider">
                    {issue.priority}
                  </Text>
                </View>
              </View>

              <View className="mb-6 flex-row flex-wrap gap-2.5">
                <View
                  style={{ backgroundColor: statusColor + '15', borderColor: statusColor + '30' }}
                  className="flex-row items-center gap-2 rounded-full border px-4 py-2">
                  <View style={{ backgroundColor: statusColor }} className="h-2 w-2 rounded-full" />
                  <Text style={{ color: statusColor }} className="text-[12px] font-extrabold uppercase tracking-wider">
                    {issue.status}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-4 py-2 dark:border-slate-700/60 dark:bg-slate-800/50">
                  <Tag size={12} color="#64748B" strokeWidth={2.5} />
                  <Text className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                    {issue.category}
                  </Text>
                </View>
              </View>

              <Text className="mb-8 text-[15px] font-medium leading-[24px] text-slate-600 dark:text-slate-300">
                {issue.description}
              </Text>

              {issue.images && issue.images.length > 0 && (
                <View className="mb-8">
                  <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Attached Media
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
                    {issue.images.slice(0, 4).map((img, i) => (
                      <View 
                        key={i} 
                        style={{ shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }} 
                        className="mx-2 mb-2 rounded-[20px] bg-white border border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                        <Image
                          source={{ uri: img }}
                          className="h-32 w-44 rounded-[20px]"
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Context Data
              </Text>
              <View className="mb-8 rounded-[24px] border border-slate-200/60 bg-slate-50/80 p-5 dark:border-slate-800/60 dark:bg-slate-800/30">
                <View className="gap-5">
                  <View className="flex-row items-start gap-4">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                       <MapPin size={16} color="#0F766E" strokeWidth={2.5} />
                    </View>
                    <View className="flex-1 justify-center py-0.5">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</Text>
                      <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mt-1">{issue.location}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-row items-center gap-4 border-t border-slate-200/60 pt-5 dark:border-slate-700/60">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                       <Calendar size={16} color="#0F766E" strokeWidth={2.5} />
                    </View>
                    <View className="flex-1 justify-center py-0.5">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reported On</Text>
                      <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {new Date(issue.dateReported).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-4 border-t border-slate-200/60 pt-5 dark:border-slate-700/60">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                       <User size={16} color="#0F766E" strokeWidth={2.5} />
                    </View>
                    <View className="flex-1 justify-center py-0.5">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reported By</Text>
                      <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mt-1">Citizen {issue.citizenName}</Text>
                    </View>
                  </View>

                  {issue.assignedOfficer && (
                    <View className="flex-row items-center gap-4 border-t border-slate-200/60 pt-5 dark:border-slate-700/60">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                         <Briefcase size={16} color="#0F766E" strokeWidth={2.5} />
                      </View>
                      <View className="flex-1 justify-center py-0.5">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assigned To</Text>
                        <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mt-1">{issue.assignedOfficer}</Text>
                      </View>
                    </View>
                  )}

                  {issue.slaDeadline && (
                    <View className="flex-row items-center gap-4 border-t border-slate-200/60 pt-5 dark:border-slate-700/60">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                         <Clock size={16} color="#0F766E" strokeWidth={2.5} />
                      </View>
                      <View className="flex-1 justify-center py-0.5">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SLA Deadline</Text>
                        <Text className="text-[14px] font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {new Date(issue.slaDeadline).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {((issue.subCategories && issue.subCategories.length > 0) || (issue.tags && issue.tags.length > 0)) && (
                <View className="mb-8 flex-row gap-4">
                  {issue.subCategories && issue.subCategories.length > 0 && (
                    <View className="flex-1">
                      <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Sub-categories
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {issue.subCategories.map((sc) => (
                          <View
                            key={sc}
                            className="rounded-xl border border-teal-200/60 bg-teal-50 px-3.5 py-1.5 dark:border-teal-800/60 dark:bg-teal-900/20">
                            <Text className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
                              {sc}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {issue.tags && issue.tags.length > 0 && (
                    <View className="flex-1">
                      <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Tags
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {issue.tags.map((tag) => (
                          <View key={tag} className="rounded-xl border border-slate-200/60 bg-slate-50 px-3.5 py-1.5 dark:border-slate-700/60 dark:bg-slate-800/50">
                            <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {lastUpdate && (
                <View className="mt-2">
                  <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Latest Update
                  </Text>
                  <View className="rounded-[24px] border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
                    <View className="mb-3 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50">
                          <MessageSquare size={14} color="#0284C7" strokeWidth={2.5} />
                        </View>
                        <Text className="text-[13px] font-extrabold text-sky-700 dark:text-sky-400">
                          {lastUpdate.role}
                        </Text>
                      </View>
                      <Text className="text-[11px] font-bold text-slate-400">
                        {new Date(lastUpdate.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <Text className="text-[14px] font-medium leading-[22px] text-slate-700 dark:text-slate-300">
                      {lastUpdate.comment}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}
