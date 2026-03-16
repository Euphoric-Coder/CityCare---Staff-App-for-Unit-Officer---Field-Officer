import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CircleCheck as CheckCircle,
  XCircle,
  MapPin,
  Navigation,
  Camera,
  Clock,
  TriangleAlert as AlertTriangle,
  ChevronRight,
  RotateCcw,
  FileText,
  ShieldCheck,
  CircleAlert,
  Locate,
  CheckCheck,
} from 'lucide-react-native';
import { Issue, IssueUpdate } from '../lib/types';

function haversineDistanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const THRESHOLD_METRES = 300;

function formatCoords(lat: number, lon: number) {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openMapLink(lat: number, lon: number, label: string) {
  const encoded = encodeURIComponent(label);
  const scheme = Platform.select({
    ios: `maps:${lat},${lon}?q=${encoded}`,
    android: `geo:${lat},${lon}?q=${lat},${lon}(${encoded})`,
  });
  const web = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  if (scheme) {
    Linking.canOpenURL(scheme)
      .then((ok) => Linking.openURL(ok ? scheme : web))
      .catch(() => Linking.openURL(web));
  } else {
    Linking.openURL(web);
  }
}

interface LocationCheckCardProps {
  label: string;
  foLat: number;
  foLon: number;
  foTimestamp: string;
  issueLat: number;
  issueLon: number;
}

function LocationCheckCard({
  label,
  foLat,
  foLon,
  foTimestamp,
  issueLat,
  issueLon,
}: LocationCheckCardProps) {
  const distance = haversineDistanceMetres(foLat, foLon, issueLat, issueLon);
  const withinThreshold = distance <= THRESHOLD_METRES;
  const distanceText =
    distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`;

  const isAfter = label === 'AFTER';

  return (
    <View
      className={`gap-2 rounded-2xl border-[1.5px] p-3.5 ${
        withinThreshold
          ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/60'
          : 'border-red-300 bg-rose-50 dark:border-red-700 dark:bg-red-950/60'
      }`}>
      {/* Header row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View
            className={`h-[26px] w-[26px] items-center justify-center rounded-lg ${
              isAfter ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-blue-100 dark:bg-blue-900/50'
            }`}>
            <Camera color={isAfter ? '#059669' : '#1D4ED8'} size={14} strokeWidth={2.5} />
          </View>
          <Text
            className={`text-[10px] font-extrabold tracking-[0.8px] ${
              isAfter
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-blue-700 dark:text-blue-400'
            }`}>
            {label} IMAGE LOCATION
          </Text>
        </View>

        <View
          className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${
            withinThreshold
              ? 'border-green-300 bg-green-100 dark:border-green-600 dark:bg-green-900/50'
              : 'border-red-300 bg-red-100 dark:border-red-600 dark:bg-red-900/50'
          }`}>
          {withinThreshold ? (
            <CheckCircle color="#16A34A" size={12} strokeWidth={2.5} />
          ) : (
            <CircleAlert color="#DC2626" size={12} strokeWidth={2.5} />
          )}
          <Text
            className={`text-[11px] font-bold ${
              withinThreshold
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
            {withinThreshold ? 'Verified' : 'Mismatch'}
          </Text>
        </View>
      </View>

      {/* Coords */}
      <View className="flex-row items-center gap-1.5">
        <Locate color="#64748B" size={13} strokeWidth={2} />
        <Text className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
          {formatCoords(foLat, foLon)}
        </Text>
      </View>

      {/* Timestamp */}
      <View className="flex-row items-center gap-1.5">
        <Clock color="#64748B" size={13} strokeWidth={2} />
        <Text className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
          {formatTimestamp(foTimestamp)}
        </Text>
      </View>

      {/* Distance indicator */}
      <View
        className={`gap-1.5 rounded-xl p-2.5 ${
          withinThreshold ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
        }`}>
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
            Distance from issue:
          </Text>
          <Text
            className={`text-[14px] font-extrabold ${
              withinThreshold
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
            {distanceText}
          </Text>
        </View>

        {/* Visual progress bar */}
        <View className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <View
            style={{
              width: `${Math.min((distance / THRESHOLD_METRES) * 100, 100)}%`,
              height: '100%',
              borderRadius: 3,
              backgroundColor: withinThreshold ? '#16A34A' : '#DC2626',
            }}
          />
        </View>

        <View className="flex-row justify-between">
          <Text className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">0m</Text>
          <Text className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            Threshold: {THRESHOLD_METRES}m
          </Text>
        </View>
      </View>

      {/* Open Maps button */}
      <TouchableOpacity
        onPress={() => openMapLink(foLat, foLon, `FO ${label} Location`)}
        activeOpacity={0.75}
        className="flex-row items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
        <Navigation color="#2563EB" size={13} strokeWidth={2.5} />
        <Text className="flex-1 text-[12px] font-bold text-blue-600 dark:text-blue-400">
          Open in Maps
        </Text>
        <ChevronRight color="#CBD5E1" size={13} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

interface UOVerificationPanelProps {
  issue: Issue;
  onApprove: (updatedIssue: Issue) => void;
  onRework: (note: string, updatedIssue: Issue) => void;
}

export default function UOVerificationPanel({
  issue,
  onApprove,
  onRework,
}: UOVerificationPanelProps) {
  const [activeTab, setActiveTab] = useState<'approve' | 'rework'>('approve');
  const [reworkNote, setReworkNote] = useState('');

  const hasBeforeLocation = !!issue.foBeforeLocation;
  const hasAfterLocation = !!issue.foAfterLocation;

  const beforeDistance = hasBeforeLocation
    ? haversineDistanceMetres(
        issue.foBeforeLocation!.latitude,
        issue.foBeforeLocation!.longitude,
        issue.coordinates.latitude,
        issue.coordinates.longitude
      )
    : null;

  const afterDistance = hasAfterLocation
    ? haversineDistanceMetres(
        issue.foAfterLocation!.latitude,
        issue.foAfterLocation!.longitude,
        issue.coordinates.latitude,
        issue.coordinates.longitude
      )
    : null;

  const beforeOk = beforeDistance !== null ? beforeDistance <= THRESHOLD_METRES : null;
  const afterOk = afterDistance !== null ? afterDistance <= THRESHOLD_METRES : null;
  const bothLocationsPassed = beforeOk !== false && afterOk !== false;

  const handleApprove = () => {
    if (!bothLocationsPassed) {
      Alert.alert(
        'Location Mismatch Detected',
        'The field officer location does not match the issue site. Do you still want to approve?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve Anyway',
            style: 'destructive',
            onPress: () => performApprove(),
          },
        ]
      );
    } else {
      performApprove();
    }
  };

  const performApprove = () => {
    const newUpdate: IssueUpdate = {
      id: `upd-${Date.now()}`,
      issueId: issue.id,
      status: 'Closed',
      comment: 'Issue resolution verified and approved by Unit Officer. Issue is now closed.',
      role: 'UnitOfficer',
      attachments: [],
      updatedBy: 'uo-1',
      scope: 'field_and_citizen',
      createdAt: new Date().toISOString(),
    };
    onApprove({
      ...issue,
      status: 'Closed',
      issueUpdates: [...issue.issueUpdates, newUpdate],
    });
  };

  const handleRequestRework = () => {
    if (!reworkNote.trim()) {
      Alert.alert('Required', 'Please enter a note explaining the rework required.');
      return;
    }
    Alert.alert('Request Rework', 'Send rework request to the field officer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: () => {
          const newUpdate: IssueUpdate = {
            id: `upd-${Date.now()}`,
            issueId: issue.id,
            status: 'Rework Required',
            comment: `Rework requested by Unit Officer: ${reworkNote.trim()}`,
            role: 'UnitOfficer',
            attachments: [],
            updatedBy: 'uo-1',
            scope: 'field_and_citizen',
            createdAt: new Date().toISOString(),
          };
          onRework(reworkNote.trim(), {
            ...issue,
            status: 'Rework Required',
            reworkComment: reworkNote.trim(),
            issueUpdates: [...issue.issueUpdates, newUpdate],
          });
          setReworkNote('');
        },
      },
    ]);
  };

  return (
    <View>
      {/* Tab bar */}
      <View className="flex-row border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => setActiveTab('approve')}
          activeOpacity={0.75}
          className={`flex-1 flex-row items-center justify-center gap-1.5 border-b-[3px] py-3.5 ${
            activeTab === 'approve' ? 'border-emerald-500' : 'border-transparent'
          }`}>
          <ShieldCheck
            color={activeTab === 'approve' ? '#10B981' : '#9CA3AF'}
            size={17}
            strokeWidth={2.5}
          />
          <Text
            className={`text-[13px] font-bold ${
              activeTab === 'approve'
                ? 'text-emerald-500 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
            Approve Resolution
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('rework')}
          activeOpacity={0.75}
          className={`flex-1 flex-row items-center justify-center gap-1.5 border-b-[3px] py-3.5 ${
            activeTab === 'rework' ? 'border-orange-500' : 'border-transparent'
          }`}>
          <RotateCcw
            color={activeTab === 'rework' ? '#F97316' : '#9CA3AF'}
            size={17}
            strokeWidth={2.5}
          />
          <Text
            className={`text-[13px] font-bold ${
              activeTab === 'rework'
                ? 'text-orange-500 dark:text-orange-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
            Request Rework
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── APPROVE TAB ─── */}
      {activeTab === 'approve' && (
        <View className="gap-4 p-4">
          {/* FO Resolution Description */}
          {issue.foResolutionDescription && (
            <View className="gap-2.5">
              <View className="flex-row items-center gap-1.5">
                <FileText color="#64748B" size={14} strokeWidth={2.5} />
                <Text className="text-[10px] font-extrabold tracking-[1.2px] text-slate-500 dark:text-slate-400">
                  FIELD OFFICER RESOLUTION
                </Text>
              </View>
              <View className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
                <Text className="text-[13px] font-medium leading-5 text-slate-600 dark:text-slate-300">
                  {issue.foResolutionDescription}
                </Text>
              </View>
            </View>
          )}

          {/* Before / After Photos */}
          {(issue.beforePhotos.length > 0 || (issue.afterPhotos?.length ?? 0) > 0) && (
            <View className="gap-2.5">
              <View className="flex-row items-center gap-1.5">
                <Camera color="#64748B" size={14} strokeWidth={2.5} />
                <Text className="text-[10px] font-extrabold tracking-[1.2px] text-slate-500 dark:text-slate-400">
                  WORK EVIDENCE
                </Text>
              </View>
              <View className="flex-row gap-2.5">
                {issue.beforePhotos.slice(0, 1).map((uri, i) => (
                  <View key={`before-${i}`} className="relative flex-1 overflow-hidden rounded-2xl">
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: 140, backgroundColor: '#E5E7EB' }}
                      resizeMode="cover"
                    />
                    <View
                      className="absolute bottom-2 left-2 rounded-lg px-2 py-0.5"
                      style={{ backgroundColor: 'rgba(15,23,42,0.75)' }}>
                      <Text className="text-[10px] font-extrabold tracking-[1px] text-white">
                        BEFORE
                      </Text>
                    </View>
                  </View>
                ))}
                {(issue.afterPhotos ?? []).slice(0, 1).map((uri, i) => (
                  <View key={`after-${i}`} className="relative flex-1 overflow-hidden rounded-2xl">
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: 140, backgroundColor: '#E5E7EB' }}
                      resizeMode="cover"
                    />
                    <View
                      className="absolute bottom-2 left-2 rounded-lg px-2 py-0.5"
                      style={{ backgroundColor: 'rgba(5,46,31,0.8)' }}>
                      <Text className="text-[10px] font-extrabold tracking-[1px] text-green-400">
                        AFTER
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Original Issue Location */}
          <View className="gap-2.5">
            <View className="flex-row items-center gap-1.5">
              <MapPin color="#64748B" size={14} strokeWidth={2.5} />
              <Text className="text-[10px] font-extrabold tracking-[1.2px] text-slate-500 dark:text-slate-400">
                ORIGINAL ISSUE LOCATION
              </Text>
            </View>
            <View className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800">
              <View className="flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
                  <MapPin color="#1D4ED8" size={18} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="mb-0.5 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                    {issue.location}
                  </Text>
                  <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {formatCoords(issue.coordinates.latitude, issue.coordinates.longitude)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() =>
                  openMapLink(
                    issue.coordinates.latitude,
                    issue.coordinates.longitude,
                    issue.location
                  )
                }
                activeOpacity={0.75}
                className="mt-2.5 flex-row items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
                <Navigation color="#1D4ED8" size={13} strokeWidth={2.5} />
                <Text className="flex-1 text-[12px] font-bold text-blue-700 dark:text-blue-400">
                  Open in Google Maps
                </Text>
                <ChevronRight color="#93C5FD" size={13} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Verification */}
          {(hasBeforeLocation || hasAfterLocation) && (
            <View className="gap-2.5">
              <View className="flex-row items-center gap-1.5">
                <Locate color="#64748B" size={14} strokeWidth={2.5} />
                <Text className="text-[10px] font-extrabold tracking-[1.2px] text-slate-500 dark:text-slate-400">
                  LOCATION VERIFICATION (≤{THRESHOLD_METRES}m threshold)
                </Text>
              </View>

              {/* Overall status banner */}
              <View
                className={`flex-row items-center gap-3 rounded-2xl border-[1.5px] p-3.5 ${
                  bothLocationsPassed
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/60'
                    : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/60'
                }`}>
                {bothLocationsPassed ? (
                  <CheckCheck color="#16A34A" size={20} strokeWidth={2.5} />
                ) : (
                  <AlertTriangle color="#DC2626" size={20} strokeWidth={2.5} />
                )}
                <View className="flex-1">
                  <Text
                    className={`mb-0.5 text-[14px] font-extrabold ${
                      bothLocationsPassed
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                    {bothLocationsPassed ? 'Location Verified' : 'Location Mismatch Detected'}
                  </Text>
                  <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    {bothLocationsPassed
                      ? 'Field officer was at the correct location'
                      : `Officer was outside the ${THRESHOLD_METRES}m threshold`}
                  </Text>
                </View>
              </View>

              {hasBeforeLocation && (
                <LocationCheckCard
                  label="BEFORE"
                  foLat={issue.foBeforeLocation!.latitude}
                  foLon={issue.foBeforeLocation!.longitude}
                  foTimestamp={issue.foBeforeLocation!.timestamp}
                  issueLat={issue.coordinates.latitude}
                  issueLon={issue.coordinates.longitude}
                />
              )}

              {hasAfterLocation && (
                <LocationCheckCard
                  label="AFTER"
                  foLat={issue.foAfterLocation!.latitude}
                  foLon={issue.foAfterLocation!.longitude}
                  foTimestamp={issue.foAfterLocation!.timestamp}
                  issueLat={issue.coordinates.latitude}
                  issueLon={issue.coordinates.longitude}
                />
              )}
            </View>
          )}

          {/* Approve Button */}
          <TouchableOpacity
            onPress={handleApprove}
            activeOpacity={0.85}
            className="overflow-hidden rounded-2xl">
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}>
              <CheckCircle color="#FFFFFF" size={20} strokeWidth={2.5} />
              <Text className="text-[15px] font-extrabold text-white">
                Approve Resolution & Close Issue
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {!bothLocationsPassed && (
            <View className="flex-row items-start gap-2.5 rounded-xl border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950/40">
              <AlertTriangle color="#D97706" size={15} strokeWidth={2.5} />
              <Text className="flex-1 text-[12px] font-semibold leading-[18px] text-yellow-800 dark:text-yellow-300">
                Location mismatch detected. You can still approve but will be prompted to confirm.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ─── REWORK TAB ─── */}
      {activeTab === 'rework' && (
        <View className="gap-4 p-4">
          <View className="flex-row items-start gap-3 rounded-2xl border-[1.5px] border-orange-300 bg-orange-50 p-3.5 dark:border-orange-700 dark:bg-orange-950/40">
            <RotateCcw color="#F97316" size={18} strokeWidth={2.5} />
            <View className="flex-1">
              <Text className="mb-0.5 text-[15px] font-extrabold text-orange-700 dark:text-orange-400">
                Request Rework
              </Text>
              <Text className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                The field officer will be notified and must redo the work.
              </Text>
            </View>
          </View>

          <View className="gap-2.5">
            <Text className="text-[10px] font-extrabold tracking-[1.2px] text-slate-500 dark:text-slate-400">
              REWORK NOTE (required)
            </Text>
            <View
              className={`rounded-2xl border-[1.5px] bg-slate-50 px-3.5 py-3 dark:bg-slate-800 ${
                reworkNote.length > 0
                  ? 'border-orange-400 dark:border-orange-500'
                  : 'border-slate-200 dark:border-slate-700'
              }`}>
              <TextInput
                value={reworkNote}
                onChangeText={setReworkNote}
                placeholder="Describe exactly what needs to be redone and why the current work is unsatisfactory..."
                placeholderTextColor="#94A3B8"
                multiline
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  minHeight: 110,
                  textAlignVertical: 'top',
                  color: undefined,
                }}
                className="text-slate-900 dark:text-slate-100"
              />
            </View>
            <Text className="text-right text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {reworkNote.length} characters
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleRequestRework}
            activeOpacity={0.85}
            className="overflow-hidden rounded-2xl">
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}>
              <RotateCcw color="#FFFFFF" size={19} strokeWidth={2.5} />
              <Text className="text-[15px] font-extrabold text-white">Send Rework Request</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
