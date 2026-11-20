import ServiceStackPanel from "./ServiceStackPanel";
import ServiceFeatureStory from "./ServiceFeatureStory";
import styles from "./ServiceStackStory.module.css";

/** Each opaque sticky section is covered by the next section in normal scroll order. */
export default function ServiceStackStory() {
  return <div id="service-stories" className={styles.stack} data-service-stack>
    {(["basic", "dining", "display"] as const).map(service => (
      <ServiceStackPanel key={service} kind={service}>
        <ServiceFeatureStory service={service} />
      </ServiceStackPanel>
    ))}
  </div>;
}
