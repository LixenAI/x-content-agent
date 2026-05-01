import React from 'react';
import { CalendarDays, Plus, Image, Smartphone, Briefcase, BookOpen, Edit2 } from 'lucide-react';

interface ScheduleQueueProps {
  posts: any[];
  onNewPost: () => void;
  onEditPost: (post: any) => void;
}

export function ScheduleQueue({ posts, onNewPost, onEditPost }: ScheduleQueueProps) {
  const days = [
    { name: 'MON', num: '21', count: '2 posts' },
    { name: 'TUE', num: '22', count: '1 post' },
    { name: 'WED', num: '23', count: '3 posts' },
    { name: 'THU', num: '24', count: '1 post', today: true },
    { name: 'FRI', num: '25', count: '2 posts' },
    { name: 'SAT', num: '26', count: '1 post' },
    { name: 'SUN', num: '27', count: '—' },
  ];

  const getIconData = (format: string, platform: string) => {
    if (format === 'carousel' || format === 'story') return { icon: Image, color: 'text-pink-500' };
    if (format === 'video') return { icon: Smartphone, color: 'text-black' };
    if (platform === 'LinkedIn') return { icon: Briefcase, color: 'text-blue-700' };
    return { icon: BookOpen, color: 'text-blue-600' };
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-renx-border flex items-center justify-between">
          <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em] flex items-center gap-2">
            <CalendarDays size={16} className="text-renx-blue" /> Content Queue
          </div>
          <button 
            onClick={onNewPost}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-renx-blue text-white rounded-md text-[11.5px] font-bold tracking-[0.03em] hover:bg-[#185a8c] transition-colors"
          >
            <Plus size={14} /> New Post
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-7 gap-1.5 mb-5 text-left">
            {days.map(d => (
              <div key={d.name} className={`bg-renx-surface rounded-lg p-2.5 text-center border-1.5 transition-colors cursor-pointer ${d.today ? 'border-renx-blue bg-renx-blue/5' : 'border-transparent hover:border-renx-blue/30'}`}>
                <div className="text-[10px] text-renx-gray font-semibold tracking-[0.05em] mb-1">{d.name}</div>
                <div className="font-heading text-base font-bold text-renx-navy">{d.num}</div>
                <div className={`text-[9px] font-semibold mt-1 ${d.count === '—' ? 'text-renx-gray' : 'text-renx-blue'}`}>{d.count}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-left">
            {posts.map(post => {
              const iconData = getIconData(post.format, post.platform);
              const PostIcon = iconData.icon;
              return (
                <div key={post.id} className="flex items-center gap-3 p-3 px-4 rounded-lg bg-renx-surface border-1.5 border-renx-border hover:border-renx-blue hover:bg-white transition-all group">
                  <div className={`text-[18px] w-8 text-center ${iconData.color}`}>
                    <PostIcon size={20} className="mx-auto" />
                  </div>
                  <div className="flex-1">
                    <div className="font-heading text-xs font-bold text-renx-navy mb-0.5">{post.topic}</div>
                    <div className="text-[11px] text-renx-gray">{post.platform} · {post.dateStr}</div>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditPost(post); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-renx-gray hover:text-renx-blue hover:bg-renx-blue/10 rounded transition-all"
                    title="Edit Post"
                  >
                    <Edit2 size={14} />
                  </button>

                  {post.status === 'SCHEDULED' && <span className="text-[10px] font-bold px-2.5 py-1 rounded-[10px] font-heading tracking-[0.04em] bg-[#E8F4FD] text-[#1877F2]">SCHEDULED</span>}
                  {post.status === 'DRAFT' && <span className="text-[10px] font-bold px-2.5 py-1 rounded-[10px] font-heading tracking-[0.04em] bg-[#FFF3E0] text-[#E65100]">DRAFT</span>}
                  {post.status === 'POSTED' && <span className="text-[10px] font-bold px-2.5 py-1 rounded-[10px] font-heading tracking-[0.04em] bg-renx-success/15 text-renx-success">POSTED</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden self-start">
        <div className="px-6 py-4 border-b border-renx-border">
          <div className="font-heading text-[13px] font-bold text-renx-navy tracking-[0.02em] text-left">📬 Post Performance</div>
        </div>
        <div className="p-6 text-left">
          <div className="bg-white rounded-xl p-4.5 shadow-sm border-l-4 border-renx-success mb-3 border border-renx-border/50">
            <div className="text-[10.5px] text-renx-gray font-semibold tracking-[0.06em] uppercase mb-2">Posts This Week</div>
            <div className="font-heading text-[26px] font-extrabold text-renx-navy mb-1">7</div>
            <div className="text-[11px] text-renx-success font-semibold">↑ On track · 1/day target</div>
          </div>
          
          <div className="bg-white rounded-xl p-4.5 shadow-sm border-l-4 border-renx-blue mb-4 border border-renx-border/50">
            <div className="text-[10.5px] text-renx-gray font-semibold tracking-[0.06em] uppercase mb-2">Avg. Reach per Post</div>
            <div className="font-heading text-[26px] font-extrabold text-renx-navy mb-1">847</div>
            <div className="text-[11px] text-renx-success font-semibold">↑ 18% from last week</div>
          </div>

          <div className="mt-5">
            <div className="font-heading text-[10px] font-bold text-renx-blue tracking-[0.1em] uppercase mb-2">TOP PERFORMER THIS WEEK</div>
            <div className="bg-renx-surface rounded-[10px] p-3.5 mt-1.5 border border-renx-border">
              <div className="font-heading text-xs font-bold text-renx-navy mb-1">AI replaced my admin — carousel</div>
              <div className="text-[11.5px] text-renx-gray">Instagram · 2,341 views · 87 saves · 34 shares</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
