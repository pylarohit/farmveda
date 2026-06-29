"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  image_url: string;
  source_id: string;
  pubDate: string;
}

export function NewsWidget() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        
        if (data && data.results) {
          // Filter out articles without images
          const validNews = data.results.filter((item: any) => item.image_url);
          setNews(validNews);
        }
      } catch (error) {
        console.error("Failed to fetch news", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60);
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (!loading && news.length === 0) {
    return null; // Don't show anything if no news found
  }

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar snap-x">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-[280px] w-[280px] sm:w-[300px] shrink-0 snap-start animate-pulse shadow-sm border border-slate-100 flex flex-col">
              <div className="w-full h-[140px] bg-slate-200 rounded-t-3xl"></div>
              <div className="p-5 flex flex-col gap-3">
                <div className="h-4 w-full bg-slate-200 rounded"></div>
                <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                <div className="mt-4 h-3 w-1/2 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar snap-x">
          {news.map((article) => (
            <a 
              key={article.article_id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-3xl w-[280px] sm:w-[300px] shrink-0 snap-start overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col"
            >
              {/* Thumbnail Container */}
              <div className="relative w-full h-[150px] overflow-hidden bg-slate-100">
                <img 
                  src={article.image_url} 
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=600&auto=format&fit=crop';
                  }}
                />
              </div>
              
              {/* Content */}
              <div className="p-5 flex flex-col flex-1 bg-white">
                <h3 className="font-bold text-slate-800 text-sm font-sora leading-[1.4] line-clamp-2 mb-3 group-hover:text-emerald-700 transition-colors">
                  {article.title}
                </h3>
                
                {/* Meta footer */}
                <div className="mt-auto flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span className="bg-slate-50 px-2 py-1 rounded-md text-slate-500 uppercase tracking-wider truncate max-w-[100px]">
                    {article.source_id}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(article.pubDate)}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
