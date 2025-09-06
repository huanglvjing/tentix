import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { CopyIcon, CheckIcon, RefreshCwIcon, SparklesIcon, FileTextIcon, BotIcon } from "lucide-react";
import { useToast } from "../../../hooks/use-toast";
import { cn } from "../../../lib/utils";

export interface ContextData {
  userId: string;
  userName: string;
  namespace?: string;
  region?: string;
  ticketId: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  recentMessages: string;
  createdAt: string;
  category?: string;
  module?: string;
  organizedText?: string; 
}

interface ContextOrganizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  authToken: string;
}

export function ContextOrganizerDialog({
  open,
  onOpenChange,
  ticketId,
  authToken,
}: ContextOrganizerDialogProps) {
  const { toast } = useToast();
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [editableText, setEditableText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");


  const formatContextText = useCallback((data: ContextData): string => {

    if (data.organizedText) {
      return data.organizedText;
    }
    

    return `===== 工单上下文信息 =====

🔹 用户信息
• 用户ID: ${data.userId}
• 用户名称: ${data.userName}
• 命名空间: ${data.namespace || '无'}
• 区域: ${data.region || '无'}

🔹 工单基础信息
• 工单ID: ${data.ticketId}
• 标题: ${data.title}
• 模块: ${data.module || '无'}
• 分类: ${data.category || '无'}
• 优先级: ${data.priority}
• 状态: ${data.status}
• 创建时间: ${data.createdAt}

🔹 问题描述
${data.description}

🔹 对话记录
${data.recentMessages}

===========================
整理时间: ${new Date().toLocaleString()}`;
  }, []);


  const handleFetchContext = useCallback(async () => {
    if (!ticketId || !authToken) {
      console.log("缺少必要参数:", { ticketId, authToken: authToken ? "存在" : "不存在" });
      toast({
        title: "参数错误",
        description: `缺少必要参数: ${!ticketId ? "工单ID" : "认证令牌"}`,
        variant: "destructive",
      });
      return;
    }

    console.log("开始获取上下文，参数:", { ticketId, authToken: authToken.substring(0, 10) + "..." });
    setIsLoading(true);
    setProcessingStep("正在获取工单基本信息...");
    
    try {

      setProcessingStep("📋 正在获取工单基本信息...");
      
      console.log("发送请求到:", "/api/chat/get-context-data");
      const contextResponse = await fetch("/api/chat/get-context-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ticketId }),
      });

      console.log("API响应状态:", contextResponse.status);
      
      if (!contextResponse.ok) {
        const errorText = await contextResponse.text();
        console.error("API响应错误:", errorText);
        throw new Error(`获取数据失败: ${contextResponse.status} - ${errorText}`);
      }

      const contextResult = await contextResponse.json();
      if (!contextResult.success) {
        throw new Error(contextResult.error || "获取数据失败");
      }

      const rawData = contextResult.data;
      console.log("获取到的基础数据:", rawData);
      

      setProcessingStep("🔍 正在分析对话记录和上下文...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
  
      setProcessingStep("🤖 正在智能整理格式...");
      
      const aiResponse = await fetch("/api/chat/ai-organize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rawData }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI整理失败: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();
      if (!aiResult.success) {
        throw new Error(aiResult.error || "AI整理失败");
      }

      const organizedData = aiResult.data;
      console.log("AI整理后的数据:", organizedData);
      

      setProcessingStep("✨ 正在生成专业报告格式...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setContextData(organizedData);
      const formattedText = formatContextText(organizedData);
      console.log("最终格式化文本:", formattedText);
      setEditableText(formattedText);
      
      toast({
        title: "🎉 整理完成",
        description: "AI已成功整理工单上下文，可以直接复制使用",
        variant: "default",
      });
    } catch (error: any) {
      console.error("获取上下文失败:", error);
      toast({
        title: "整理失败",
        description: error.message || "无法获取工单上下文，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProcessingStep("");
    }
  }, [ticketId, authToken, formatContextText, toast]);


  const handleCopy = useCallback(async () => {
    if (!editableText.trim()) {
      toast({
        title: "复制失败",
        description: "没有内容可复制",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(editableText);
      setIsCopied(true);
      toast({
        title: "复制成功",
        description: "上下文信息已复制到剪贴板",
      });

 
      setTimeout(() => setIsCopied(false), 3000);
    } catch (error) {
      console.error("复制失败:", error);
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板，请手动复制",
        variant: "destructive",
      });
    }
  }, [editableText, toast]);


  const handleRefresh = useCallback(() => {
    if (contextData) {
      setEditableText(formatContextText(contextData));
      toast({
        title: "已重置",
        description: "内容已重置为原始格式",
      });
    }
  }, [contextData, formatContextText, toast]);


  useEffect(() => {
    if (open && ticketId && authToken) {
      handleFetchContext();
    }
  }, [open, ticketId, authToken, handleFetchContext]);


  useEffect(() => {
    if (!open) {
      setContextData(null);
      setEditableText("");
      setIsCopied(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5 text-muted-foreground" />
            工单上下文整理
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* 工具栏 */}
          <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-md border">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchContext}
                disabled={isLoading || !ticketId}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
                重新生成
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={!contextData}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className="w-4 h-4" />
                重置格式
              </Button>
            </div>

            <Button
              size="sm"
              onClick={handleCopy}
              disabled={!editableText.trim()}
              className={cn(
                "flex items-center gap-2",
                isCopied && "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              {isCopied ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  已复制
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4" />
                  复制
                </>
              )}
            </Button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            <Label htmlFor="context-text" className="text-sm font-medium">
              整理的上下文内容（可编辑）
            </Label>
            <div className="mt-2 h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-96 border rounded-md bg-muted/30">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
                      <BotIcon className="w-6 h-6" />
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">正在整理中</h3>
                      
                      {/* 当前处理步骤 */}
                      <div className="p-3 bg-background rounded-md border">
                        <p className="text-sm text-muted-foreground">{processingStep}</p>
                      </div>
                      
                      {/* 简化的进度动画 */}
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Textarea
                  id="context-text"
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  placeholder="整理的上下文内容将在这里显示，您可以根据需要进行编辑..."
                  className="min-h-[400px] resize-none font-mono text-sm"
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

