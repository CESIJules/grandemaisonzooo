import type { Post } from "@/types";
import styles from "./TimelineItem.module.css";

interface Props {
  post: Post;
}

export default function TimelineItem({ post }: Props) {
  const { title, subtitle, date, artist, link, image } = post;

  const content = (
    <article className={styles.item}>
      {image && (
        <div className={styles.imageWrap}>
          <img src={image} alt={title} className={styles.image} loading="lazy" />
        </div>
      )}
      <div className={styles.body}>
        <span className={styles.artist}>{artist}</span>
        <h3 className={styles.title}>{title}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <time className={styles.date} dateTime={date}>{date}</time>
      </div>
    </article>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className={styles.wrapper}>
        {content}
      </a>
    );
  }

  return <div className={styles.wrapper}>{content}</div>;
}
