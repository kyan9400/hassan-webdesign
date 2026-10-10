/**
 * Inline <head> script: applies the stored theme and the resolved motion preference before the
 * first paint (no flash), and marks <html> with `js` so CSS-only reveal states are safe without JS.
 * Motion: ?motion=full|reduced → localStorage["hw:motion"] → prefers-reduced-motion.
 * Gallery: a provisional `data-gallery` ("3d" | "cards" | "list", see lib/gallery-mode.ts) from the
 * media query, localStorage["hw:workView"] and ?quality=low, so the work section lays out correctly
 * before React runs.
 */
export const themeMotionScript =
  '(function(){var d=document.documentElement;try{var t=localStorage.getItem("hw:theme");if(t==="light"||t==="dark"){d.setAttribute("data-theme",t);var c=function(){document.querySelectorAll(\'meta[name="theme-color"]\').forEach(function(m){m.setAttribute("content",t==="dark"?"#0D1712":"#F4F7F1")})};c();document.addEventListener("DOMContentLoaded",c)}}catch(e){}' +
  'var m="full";try{var q=new URLSearchParams(location.search).get("motion"),s=null;try{s=localStorage.getItem("hw:motion")}catch(e){}' +
  'if(q==="full"||q==="reduced")m=q;else if(s==="full"||s==="reduced")m=s;else if(matchMedia("(prefers-reduced-motion: reduce)").matches)m="reduced"}catch(e){}' +
  'var g="list";try{if(!matchMedia("(min-width: 1024px) and (pointer: fine)").matches)g="cards";else{var v=null;try{v=localStorage.getItem("hw:workView")}catch(e){}' +
  'if(v!=="list"&&new URLSearchParams(location.search).get("quality")!=="low")g="3d"}}catch(e){}' +
  'd.setAttribute("data-motion",m);d.setAttribute("data-gallery",g);d.classList.add("js")})();';
