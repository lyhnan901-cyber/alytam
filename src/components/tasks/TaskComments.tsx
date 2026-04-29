import { useState, useEffect } from "react";
import { MessageSquare, Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notifyNewComment } from "@/lib/notifications";
import { logCommentAdded } from "@/lib/activity-logger";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface TaskInfo {
  assignee_id: string | null;
  department_id: string | null;
  level: string;
  title: string;
}

interface TaskCommentsProps {
  taskId: string;
  taskInfo: TaskInfo;
}

export function TaskComments({ taskId, taskInfo }: TaskCommentsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch author profiles
      const commentsWithAuthors = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: author } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", comment.author_id)
            .single();
          return { ...comment, author };
        })
      );

      setComments(commentsWithAuthors);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب التعليقات",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const submitComment = async () => {
    if (!user?.id || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("task_comments").insert({
        task_id: taskId,
        author_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      // Send notifications
      await notifyNewComment(
        user.id,
        taskId,
        taskInfo.title,
        taskInfo.assignee_id,
        taskInfo.department_id,
        taskInfo.level
      );

      // Log activity
      await logCommentAdded(user.id, taskId, taskInfo.title);

      toast({ title: "تم إضافة التعليق" });
      setNewComment("");
      fetchComments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في إضافة التعليق",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("ar-SA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" />
          التعليقات ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="أضف تعليقاً..."
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={submitComment}
            disabled={submitting || !newComment.trim()}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-2" />
            )}
            إرسال التعليق
          </Button>
        </div>

        {comments.length > 0 && <Separator />}

        {/* Comments List */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            لا توجد تعليقات بعد
          </p>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.author?.avatar_url || ""} />
                  <AvatarFallback className="text-xs">
                    {comment.author ? getInitials(comment.author.full_name) : <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {comment.author?.full_name || "غير معروف"}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
