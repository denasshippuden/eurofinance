import type { FinanceGroup, FinanceUser, Profile, UserRole } from "@/lib/types";

export const financeGroups: FinanceGroup[] = [
  { id: "group-a", key: "group-a", name: "Grupo A" },
  { id: "group-b", key: "group-b", name: "Grupo B" }
];

export const appUsers: FinanceUser[] = [
  {
    id: "master-user",
    email: "admin@financeos.local",
    name: "Usuário master",
    groupId: "group-a",
    groupName: "Grupo A",
    role: "master"
  },
  {
    id: "eduarda-bonalume",
    email: "eduarda@financeos.local",
    name: "Eduarda Bonalume",
    groupId: "group-a",
    groupName: "Grupo A",
    role: "member"
  },
  {
    id: "pedro-cabral-roscao",
    email: "pedro@financeos.local",
    name: "Pedro Cabral do Roscão",
    groupId: "group-b",
    groupName: "Grupo B",
    role: "member"
  },
  {
    id: "gabrielle",
    email: "gabrielle@financeos.local",
    name: "Gabrielle",
    groupId: "group-b",
    groupName: "Grupo B",
    role: "member"
  }
];

export function getGroupName(groupId: string) {
  return financeGroups.find((group) => group.id === groupId)?.name ?? "Grupo";
}

export function findAppUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return appUsers.find((user) => user.email === normalizedEmail);
}

export function findAppUserById(userId: string) {
  return appUsers.find((user) => user.id === userId);
}

export function getUsersByGroup(groupId: string) {
  return appUsers.filter((user) => user.groupId === groupId);
}

export function getWalletUserName(userId: string) {
  return findAppUserById(userId)?.name ?? "Carteira";
}

export function getVisibleWalletUsers(profile: Pick<Profile, "appUserId" | "role">, walletUsers: FinanceUser[]) {
  if (profile.role === "master") {
    return walletUsers;
  }

  return walletUsers.filter((user) => user.id === profile.appUserId);
}

interface ResolveAppUserOptions {
  id?: string;
  groupId?: string;
  groupName?: string;
  role?: UserRole;
}

export function resolveAppUser(email: string, fallbackName?: string, options: ResolveAppUserOptions = {}): FinanceUser {
  const normalizedEmail = email.trim().toLowerCase();
  const user = findAppUserByEmail(normalizedEmail);

  if (user) {
    return user;
  }

  const groupId = options.groupId ?? "group-a";

  return {
    id: options.id ?? normalizedEmail,
    email: normalizedEmail,
    name: fallbackName || normalizedEmail.split("@")[0]?.replace(/[._-]/g, " ") || "Usuário",
    groupId,
    groupName: options.groupName ?? getGroupName(groupId),
    role: options.role ?? "member"
  };
}
