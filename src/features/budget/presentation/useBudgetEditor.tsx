import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { TransactionModal } from "@/features/budget/presentation/components/TransactionModal";
import { TransactionFormModal } from "@/features/budget/presentation/components/TransactionFormModal";
import { AccountModals } from "@/features/budget/presentation/components/AccountModals";
import { CategoryModals } from "@/features/budget/presentation/components/CategoryModals";
import { Account, Category, Transaction, TransactionType } from "@/features/budget/presentation/types";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { defaultColors } from "@/shared/theme/palettes";
import { useConfirm, useToast } from "@/shared/ui/components";
import { useTranslations } from "next-intl";
import { API_ROUTES, withQuery } from "@/shared/config/routes";

type BudgetModal =
  | { type: "addAccount" }
  | { type: "editAccount"; account: Account }
  | { type: "addCategory"; kind: "INCOME" | "EXPENSE" }
  | { type: "editCategory"; category: Category }
  | { type: "addTransaction"; kind: TransactionType }
  | { type: "editTransaction"; transaction: Transaction };
interface BudgetEditorOptions {
  fetchData: () => void;
  accounts: Account[];
  categories: Category[];
}

export function useBudgetEditor({ fetchData, accounts, categories }: BudgetEditorOptions) {
  const [modal, setModal] = useState<BudgetModal | null>(null);
  const onClose = () => setModal(null);
  const tBudget = useTranslations("budget");
  const tc = useTranslations("common");
  const editingAccount = modal?.type === "editAccount" ? modal.account : null;
  const editingCategory = modal?.type === "editCategory" ? modal.category : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Form states
  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [accountColor, setAccountColor] = useState(defaultColors.tag);

  const [categoryName, setCategoryName] = useState("");
  const categoryType = modal?.type === "addCategory" ? modal.kind : editingCategory?.type ?? "EXPENSE";
  const [categoryColor, setCategoryColor] = useState(defaultColors.tag);
  const toast = useToast();
  const confirm = useConfirm();
  const showSuccess = (message: string) => toast.success(message, { icon: <TrendingUp className="h-5 w-5" /> });
  // Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!accountName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.budget.accounts, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName.trim(),
          balance: accountBalance ? Number(accountBalance) : 0,
          color: accountColor,
        }),
      });

      if (res.ok) {
        setAccountName("");
        setAccountBalance("");
        setAccountColor(defaultColors.tag);
        onClose();
        showSuccess(tBudget("toast.accountAdded"));
        notifyDataChanged("budget");
        fetchData();
      } else {
        const body = await res.json();
        toast.error(body.error || tBudget("toast.accountAddFailed"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Account
  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!editingAccount || !accountName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.budget.accounts, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAccount.id,
          name: accountName.trim(),
          balance: accountBalance ? Number(accountBalance) : 0,
          color: accountColor,
        }),
      });

      if (res.ok) {
        setAccountName("");
        setAccountBalance("");
        setAccountColor(defaultColors.tag);
        onClose();
        showSuccess(tBudget("toast.accountUpdated"));
        notifyDataChanged("budget");
        fetchData();
      } else {
        const body = await res.json();
        toast.error(body.error || tBudget("toast.accountUpdateFailed"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async (id: string) => {
    if (!(await confirm({ message: tBudget("confirm.deleteAccount"), confirmLabel: tc("action.delete") }))) return;

    try {
      const res = await fetch(withQuery(API_ROUTES.budget.accounts, { id }), {
        method: "DELETE",
      });

      if (res.ok) {
        setAccountName("");
        setAccountBalance("");
        onClose();
        showSuccess(tBudget("toast.accountDeleted"));
        notifyDataChanged("budget");
        fetchData();
      } else {
        const body = await res.json();
        toast.error(body.error || tBudget("toast.accountDeleteFailed"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!categoryName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.budget.categories, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName.trim(),
          type: categoryType,
          color: categoryColor,
        }),
      });

      if (res.ok) {
        setCategoryName("");
        setCategoryColor(defaultColors.tag);
        onClose();
        showSuccess(tBudget("toast.categoryAdded"));
        notifyDataChanged("budget");
        fetchData();
      } else {
        const body = await res.json();
        toast.error(body.error || tBudget("toast.categoryAddFailed"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Category
  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!editingCategory || !categoryName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.budget.categories, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCategory.id,
          name: categoryName.trim(),
          color: categoryColor,
        }),
      });

      if (res.ok) {
        setCategoryName("");
        setCategoryColor(defaultColors.tag);
        onClose();
        showSuccess(tBudget("toast.categoryUpdated"));
        notifyDataChanged("budget");
        fetchData();
      } else {
        const body = await res.json();
        toast.error(body.error || tBudget("toast.categoryUpdateFailed"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (!(await confirm({ message: tBudget("confirm.deleteCategory"), confirmLabel: tc("action.delete") }))) return;

    try {
      const res = await fetch(withQuery(API_ROUTES.budget.categories, { id }), {
        method: "DELETE",
      });

      if (res.ok) {
        setCategoryName("");
        setCategoryColor(defaultColors.tag);
        onClose();
        showSuccess(tBudget("toast.categoryDeleted"));
        notifyDataChanged("budget");
        fetchData();
      } else {
        const body = await res.json();
        toast.error(body.error || tBudget("toast.categoryDeleteFailed"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const open = (next: BudgetModal) => {
    if (next.type === "addAccount" || next.type === "editAccount") {
      const account = next.type === "editAccount" ? next.account : null;
      setAccountName(account?.name ?? "");
      setAccountBalance(account ? String(account.balance) : "");
      setAccountColor(account?.color || defaultColors.tag);
    } else if (next.type === "editCategory") {
      setCategoryName(next.category.name);
      setCategoryColor(next.category.color || defaultColors.tag);
    } else if (next.type === "addCategory") {
      setCategoryColor(defaultColors.tag);
    }
    setModal(next);
  };

  const dialogs = (
    <>
      <AccountModals
        showAddAccount={modal?.type === "addAccount"}
        onClose={onClose}
        handleAddAccount={handleAddAccount}
        showEditAccount={modal?.type === "editAccount"}
        editingAccount={editingAccount}
        handleEditAccount={handleEditAccount}
        handleDeleteAccount={handleDeleteAccount}
        accountName={accountName}
        setAccountName={setAccountName}
        accountBalance={accountBalance}
        setAccountBalance={setAccountBalance}
        accountColor={accountColor}
        setAccountColor={setAccountColor}
        isSubmitting={isSubmitting}
      />

      {/* 2 & 2.5. Modal Add & Edit Category */}
      <CategoryModals
        showAddCategory={modal?.type === "addCategory"}
        onClose={onClose}
        categoryType={categoryType}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        categoryColor={categoryColor}
        setCategoryColor={setCategoryColor}
        handleAddCategory={handleAddCategory}
        showEditCategory={modal?.type === "editCategory"}
        editingCategory={editingCategory}
        handleEditCategory={handleEditCategory}
        handleDeleteCategory={handleDeleteCategory}
        isSubmitting={isSubmitting}
      />

      {/* 3. Modal Log Transaction (Add Expense / Income / Transfer) */}
      <TransactionModal
        isOpen={modal?.type === "addTransaction"}
        onClose={onClose}
        onSuccess={() => fetchData()}
        accounts={accounts}
        categories={categories}
        initialTab={modal?.type === "addTransaction" ? modal.kind : "EXPENSE"}
      />

      {/* 4. Modal Edit Transaction (Edit Expense / Income / Transfer) */}
      <TransactionFormModal
        isOpen={modal?.type === "editTransaction"}
        onClose={onClose}
        onSuccess={() => {
          showSuccess(tBudget("toast.transactionUpdated"));
          fetchData();
        }}
        accounts={accounts}
        categories={categories}
        transaction={modal?.type === "editTransaction" ? modal.transaction : null}
      />
    </>
  );
  return { open, dialogs };
}
