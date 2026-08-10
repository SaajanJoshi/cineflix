const paths = {
  play: 'M8 5v14l11-7z',
  info: 'M11 10h2v7h-2zm0-3h2v2h-2z M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  check: 'm9.2 16.2-4.4-4.4 1.4-1.4 3 3 8.6-8.6 1.4 1.4z',
  search: 'M10.5 3a7.5 7.5 0 1 0 4.7 13.3l4.2 4.2 1.4-1.4-4.2-4.2A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z',
  left: 'm15.4 5.4-1.4-1.4L6 12l8 8 1.4-1.4L8.8 12z',
  right: 'm8.6 18.6 1.4 1.4 8-8-8-8-1.4 1.4 6.6 6.6z',
  close: 'm6.3 4.9 5.7 5.7 5.7-5.7 1.4 1.4-5.7 5.7 5.7 5.7-1.4 1.4-5.7-5.7-5.7 5.7-1.4-1.4 5.7-5.7-5.7-5.7z',
  volume: 'M4 9v6h4l5 4V5L8 9zm11.5-.5a5 5 0 0 1 0 7l1.4 1.4a7 7 0 0 0 0-9.8z',
  mute: 'M4 9v6h4l5 4V5L8 9zm12.7 1.3-1.4-1.4L13 11.2l-2.3-2.3-1.4 1.4 2.3 2.3-2.3 2.3 1.4 1.4L13 14l2.3 2.3 1.4-1.4-2.3-2.3z',
  chevronDown: 'm6.7 8.6 5.3 5.3 5.3-5.3 1.4 1.4-6.7 6.7L5.3 10z',
  refresh: 'M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.2L13 11h7V4z',
};

export default function Icon({ name, size = 24, ...props }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="currentColor" focusable="false" {...props}>
      <path d={paths[name] || paths.info} />
    </svg>
  );
}
