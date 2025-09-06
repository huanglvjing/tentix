import { Avatar, AvatarFallback, AvatarImage } from "tentix-ui";
import { useUserCacheStore, type CachedUser } from "../../store/user-cache";
import { useEffect } from "react";
import { cn } from "@lib/utils";

interface CachedAvatarProps {
  user: {
    id: number;
    name: string;
    nickname?: string;
    avatar: string;
    role?: string;
  };
  className?: string;
  fallbackClassName?: string;
  size?: "sm" | "md" | "lg";
  showDebugInfo?: boolean;
}

interface CachedAvatarByIdProps {
  userId: number;
  fallbackText?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showDebugInfo?: boolean;
}

// 共用的尺寸配置
const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8", 
  lg: "h-10 w-10",
};

// 共用的调试指示器组件
function DebugIndicator({ cachedUser, userName }: { cachedUser: any; userName: string }) {
  return (
    <div 
      title={cachedUser ? `缓存命中: ${userName}` : `缓存未命中: ${userName}`}
    >
    </div>
  );
}

export function CachedAvatar({ 
  user, 
  className, 
  fallbackClassName,
  size = "md",
  showDebugInfo = false
}: CachedAvatarProps) {
  const setUser = useUserCacheStore((state: any) => state.setUser);
  const getUser = useUserCacheStore((state: any) => state.getUser);
  

  const cachedUser = getUser(user.id);
  const effectiveUser = cachedUser || user;
  

  useEffect(() => {
    if (user && (!cachedUser || cachedUser.avatar !== user.avatar)) {
      const userToCache: Omit<CachedUser, 'updatedAt'> = {
        id: user.id,
        name: user.name,
        nickname: user.nickname || user.name,
        avatar: user.avatar,
        role: user.role || 'unknown'
      };
      
      setUser(userToCache);
      
      if (showDebugInfo && import.meta.env.DEV) {
        console.log(`🔄 [CachedAvatar] 更新缓存: ${user.name} (ID: ${user.id})`);
      }
    }
  }, [user.id, user.avatar, cachedUser?.avatar, setUser, showDebugInfo]);

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage 
          src={effectiveUser.avatar} 
          alt={effectiveUser.name}
          loading="lazy"
        />
        <AvatarFallback className={fallbackClassName}>
          {effectiveUser.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* 开发环境下显示缓存状态指示器 */}
      {showDebugInfo && import.meta.env.DEV && (
        <DebugIndicator cachedUser={cachedUser} userName={effectiveUser.name} />
      )}
    </div>
  );
}

export function CachedAvatarById({ 
  userId, 
  fallbackText = "U",
  className,
  size = "md",
  showDebugInfo = false
}: CachedAvatarByIdProps) {
  const getUser = useUserCacheStore((state: any) => state.getUser);
  const user = getUser(userId);
  
  if (!user) {
    if (showDebugInfo && import.meta.env.DEV) {
      console.warn(`⚠️ [CachedAvatarById] 用户 ${userId} 不在缓存中`);
    }
    
    return (
      <div className="relative">
        <Avatar className={cn(sizeClasses[size], className)}>
          <AvatarFallback>
            {fallbackText}
          </AvatarFallback>
        </Avatar>
        {/* 显示缓存未命中的指示器 */}
        {showDebugInfo && import.meta.env.DEV && (
          <DebugIndicator cachedUser={null} userName={`用户${userId}`} />
        )}
      </div>
    );
  }
  
  return (
    <CachedAvatar 
      user={user} 
      className={className}
      size={size}
      showDebugInfo={showDebugInfo}
    />
  );
}
