import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, User } from '../firebase';
import { Transaction, Category, Account, Goal } from '../types/finance';

export interface HouseholdDoc {
  id: string;
  name: string;
  ownerId: string;
  memberUids: string[];
  inviteCode: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfileDoc {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  householdId: string;
  createdAt: string;
  updatedAt?: string;
}

// Generate human-friendly 6-char invite code
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Ensures user profile and a household exist for the logged in user.
 */
export async function getOrCreateUserProfile(user: User): Promise<{
  profile: UserProfileDoc;
  household: HouseholdDoc;
}> {
  const userRef = doc(db, 'users', user.uid);
  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    throw err;
  }

  const nowIso = new Date().toISOString();

  if (userSnap && userSnap.exists()) {
    const profile = userSnap.data() as UserProfileDoc;
    // Load associated household
    const houseRef = doc(db, 'households', profile.householdId);
    let houseSnap;
    try {
      houseSnap = await getDoc(houseRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `households/${profile.householdId}`);
      throw err;
    }

    if (houseSnap && houseSnap.exists()) {
      return { profile, household: houseSnap.data() as HouseholdDoc };
    }
  }

  // First time login or household missing: Create default shared household
  const householdId = `house_${user.uid.substring(0, 8)}_${Math.random().toString(36).substring(2, 6)}`;
  const inviteCode = generateInviteCode();
  const newHousehold: HouseholdDoc = {
    id: householdId,
    name: 'Finanças Compartilhadas',
    ownerId: user.uid,
    memberUids: [user.uid],
    inviteCode,
    createdAt: nowIso,
  };

  try {
    await setDoc(doc(db, 'households', householdId), newHousehold);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `households/${householdId}`);
    throw err;
  }

  const newProfile: UserProfileDoc = {
    id: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
    photoURL: user.photoURL || '',
    householdId,
    createdAt: nowIso,
  };

  try {
    await setDoc(userRef, newProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    throw err;
  }

  return { profile: newProfile, household: newHousehold };
}

/**
 * Join an existing household using an invite code
 */
export async function joinHouseholdWithCode(
  user: User,
  inviteCode: string
): Promise<HouseholdDoc | null> {
  const cleanCode = inviteCode.trim().toUpperCase();
  const q = query(
    collection(db, 'households'),
    where('inviteCode', '==', cleanCode)
  );

  let querySnapshot;
  try {
    querySnapshot = await getDocs(q);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'households');
    throw err;
  }

  if (querySnapshot.empty) {
    return null;
  }

  const houseDoc = querySnapshot.docs[0];
  const houseData = houseDoc.data() as HouseholdDoc;

  // Add user to memberUids if not already present
  if (!houseData.memberUids.includes(user.uid)) {
    const updatedMembers = [...houseData.memberUids, user.uid].slice(0, 10);
    try {
      await updateDoc(doc(db, 'households', houseData.id), {
        memberUids: updatedMembers,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `households/${houseData.id}`);
      throw err;
    }
    houseData.memberUids = updatedMembers;
  }

  // Update user profile with this householdId
  try {
    await updateDoc(doc(db, 'users', user.uid), {
      householdId: houseData.id,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    throw err;
  }

  return houseData;
}

/**
 * Replica a lista atual de membros do espaço para os documentos já criados.
 *
 * Cada documento grava um `memberUids` próprio — a foto da lista no momento da
 * criação — e as regras do Firestore liberam a leitura somente para quem está
 * nessa lista. Sem esta sincronização, um membro que entra depois não enxerga
 * lançamentos antigos, mesmo já estando conectado ao espaço.
 */
export async function syncHouseholdMemberUids(
  household: HouseholdDoc,
  viewerUid: string
): Promise<void> {
  const members = household.memberUids;
  if (!members.length) return;

  for (const name of ['transactions', 'categories', 'accounts', 'goals'] as const) {
    try {
      const snap = await getDocs(
        query(collection(db, name), where('memberUids', 'array-contains', viewerUid))
      );

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.householdId !== household.id) continue;

        const current = Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [];
        const isOutdated = members.some((uid) => !current.includes(uid));
        if (!isOutdated) continue;

        // Só quem já consta na lista do documento tem permissão de gravá-lo.
        try {
          await updateDoc(docSnap.ref, {
            memberUids: members,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // Outro membro conclui a sincronização na próxima abertura.
        }
      }
    } catch (err) {
      console.warn(`Falha ao sincronizar membros em ${name}:`, err);
    }
  }
}

/**
 * Subscribe to household real-time changes
 */
export function subscribeHousehold(
  householdId: string,
  onUpdate: (household: HouseholdDoc) => void
) {
  const houseRef = doc(db, 'households', householdId);
  return onSnapshot(
    houseRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as HouseholdDoc);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `households/${householdId}`);
    }
  );
}

/**
 * Real-time Transactions listener
 */
export function subscribeTransactions(
  userId: string,
  onUpdate: (txs: Transaction[]) => void
) {
  const q = query(
    collection(db, 'transactions'),
    where('memberUids', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Transaction);
      });
      // Sort by date descending
      items.sort((a, b) => (b.date > a.date ? 1 : -1));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    }
  );
}

/**
 * Real-time Categories listener
 */
export function subscribeCategories(
  userId: string,
  onUpdate: (categories: Category[]) => void
) {
  const q = query(
    collection(db, 'categories'),
    where('memberUids', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Category);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    }
  );
}

/**
 * Real-time Accounts listener
 */
export function subscribeAccounts(
  userId: string,
  onUpdate: (accounts: Account[]) => void
) {
  const q = query(
    collection(db, 'accounts'),
    where('memberUids', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Account[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Account);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
    }
  );
}

/**
 * Real-time Goals listener
 */
export function subscribeGoals(
  userId: string,
  onUpdate: (goals: Goal[]) => void
) {
  const q = query(
    collection(db, 'goals'),
    where('memberUids', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Goal[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Goal);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'goals');
    }
  );
}

// Write Operations
export async function saveTransactionToCloud(
  tx: Transaction,
  household: HouseholdDoc,
  user: User
): Promise<void> {
  const txRef = doc(db, 'transactions', tx.id);
  const now = new Date().toISOString();

  const payload: Record<string, any> = {
    id: tx.id,
    householdId: household.id,
    memberUids: household.memberUids,
    creatorUid: user.uid,
    creatorName: user.displayName || user.email?.split('@')[0] || 'Usuário',
    description: tx.description.slice(0, 300),
    amount: Number(tx.amount) || 0,
    type: tx.type,
    category: tx.category,
    date: tx.date,
    account: tx.account,
    paymentMethod: tx.paymentMethod,
    isPaid: Boolean(tx.isPaid),
    updatedAt: now,
  };

  if (tx.notes) payload.notes = tx.notes.slice(0, 2000);
  if (tx.recurrence) payload.recurrence = tx.recurrence;
  if (tx.installment) payload.installment = tx.installment;
  if (tx.installment?.installmentGroupId) payload.installmentGroupId = tx.installment.installmentGroupId;
  if (tx.recurrenceGroupId) payload.recurrenceGroupId = tx.recurrenceGroupId;

  try {
    // Check if doc exists to determine create or update
    const snap = await getDoc(txRef);
    if (snap.exists()) {
      await updateDoc(txRef, payload);
    } else {
      payload.createdAt = now;
      await setDoc(txRef, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `transactions/${tx.id}`);
    throw err;
  }
}

export async function deleteTransactionFromCloud(txId: string): Promise<void> {
  const txRef = doc(db, 'transactions', txId);
  try {
    await deleteDoc(txRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `transactions/${txId}`);
    throw err;
  }
}

export async function deleteAllTransactionsFromCloud(userUid: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('memberUids', 'array-contains', userUid)
    );
    const snap = await getDocs(q);
    const promises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(promises);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `transactions/all`);
    throw err;
  }
}

export async function saveCategoryToCloud(
  category: Category,
  household: HouseholdDoc,
  user: User
): Promise<void> {
  const catRef = doc(db, 'categories', category.id);
  const now = new Date().toISOString();

  const payload: Record<string, any> = {
    id: category.id,
    householdId: household.id,
    memberUids: household.memberUids,
    creatorUid: user.uid,
    name: category.name.slice(0, 100),
    icon: category.icon,
    color: category.color,
    type: category.type,
    updatedAt: now,
  };

  if (category.budget !== undefined) {
    payload.budget = Number(category.budget) || 0;
  }

  try {
    const snap = await getDoc(catRef);
    if (snap.exists()) {
      await updateDoc(catRef, payload);
    } else {
      payload.createdAt = now;
      await setDoc(catRef, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `categories/${category.id}`);
    throw err;
  }
}

export async function saveAccountToCloud(
  account: Account,
  household: HouseholdDoc,
  user: User
): Promise<void> {
  const accRef = doc(db, 'accounts', account.id);
  const now = new Date().toISOString();

  const payload: Record<string, any> = {
    id: account.id,
    householdId: household.id,
    memberUids: household.memberUids,
    creatorUid: user.uid,
    name: account.name.slice(0, 100),
    type: account.type,
    initialBalance: Number(account.initialBalance) || 0,
    color: account.color,
    updatedAt: now,
  };

  if (account.cardLimit !== undefined) payload.cardLimit = Number(account.cardLimit) || 0;
  if (account.cardDueDay !== undefined) payload.cardDueDay = Number(account.cardDueDay) || 10;

  try {
    const snap = await getDoc(accRef);
    if (snap.exists()) {
      await updateDoc(accRef, payload);
    } else {
      payload.createdAt = now;
      await setDoc(accRef, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts/${account.id}`);
    throw err;
  }
}

export async function saveGoalToCloud(
  goal: Goal,
  household: HouseholdDoc,
  user: User
): Promise<void> {
  const goalRef = doc(db, 'goals', goal.id);
  const now = new Date().toISOString();

  const payload: Record<string, any> = {
    id: goal.id,
    householdId: household.id,
    memberUids: household.memberUids,
    creatorUid: user.uid,
    title: goal.title.slice(0, 120),
    targetAmount: Number(goal.targetAmount) || 0,
    currentAmount: Number(goal.currentAmount) || 0,
    deadline: goal.deadline,
    color: goal.color,
    icon: goal.icon,
    updatedAt: now,
  };

  if (goal.notes) payload.notes = goal.notes.slice(0, 1000);

  try {
    const snap = await getDoc(goalRef);
    if (snap.exists()) {
      await updateDoc(goalRef, payload);
    } else {
      payload.createdAt = now;
      await setDoc(goalRef, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `goals/${goal.id}`);
    throw err;
  }
}
