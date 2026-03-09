import type { GraphNode, GraphEdge } from '../core/types';
import { computeNodeDimensions } from './loadGraph';

interface TreeDef {
  id: string;
  label: string;
  type: 'decision' | 'leaf' | 'chance';
  children?: TreeDef[];
  edgeLabel?: string;
  data?: Record<string, unknown>;
}

const treeDef: TreeDef = {
  id: 'root',
  label: 'Does the patient present with suspected head trauma?',
  type: 'decision',
  children: [
    {
      id: 'gcs_assess',
      label: 'What is the Glasgow Coma Scale (GCS) score?',
      type: 'decision',
      edgeLabel: 'YES',
      children: [
        {
          id: 'severe_tbi',
          label: 'Is the patient hemodynamically stable?',
          type: 'decision',
          edgeLabel: 'GCS \u2264 8',
          children: [
            {
              id: 'stable_severe',
              label: 'Are there signs of intracranial hemorrhage on CT?',
              type: 'decision',
              edgeLabel: 'YES',
              children: [
                { id: 'ich_yes', label: 'Emergent Neurosurgical Intervention Required', type: 'leaf', edgeLabel: 'YES', data: { priority: 'Critical', confidence: 0.95 } },
                { id: 'ich_no', label: 'ICU Admission with ICP Monitoring Protocol', type: 'leaf', edgeLabel: 'NO', data: { priority: 'High', confidence: 0.88 } },
              ],
            },
            {
              id: 'unstable_severe',
              label: 'Is there evidence of active hemorrhage source?',
              type: 'decision',
              edgeLabel: 'NO',
              children: [
                { id: 'active_bleed', label: 'Initiate Damage Control Resuscitation', type: 'chance', edgeLabel: 'YES', data: { probability: 0.7 } },
                { id: 'no_bleed', label: 'Volume Resuscitate and Obtain CT Head', type: 'leaf', edgeLabel: 'NO', data: { priority: 'High', confidence: 0.82 } },
              ],
            },
          ],
        },
        {
          id: 'moderate_mild',
          label: 'Are there any high-risk clinical features present?',
          type: 'decision',
          edgeLabel: 'GCS 9-15',
          children: [
            {
              id: 'high_risk_yes',
              label: 'Does CT head scan show abnormal findings?',
              type: 'decision',
              edgeLabel: 'YES',
              children: [
                { id: 'abnormal_ct', label: 'Neurosurgical Consult and ICU Admission', type: 'leaf', edgeLabel: 'YES', data: { priority: 'High', confidence: 0.91 } },
                { id: 'normal_ct', label: 'Admit for Neurological Observation (q1h checks)', type: 'leaf', edgeLabel: 'NO', data: { priority: 'Medium', confidence: 0.85 } },
              ],
            },
            {
              id: 'high_risk_no',
              label: 'Is there post-traumatic amnesia exceeding 30 minutes?',
              type: 'decision',
              edgeLabel: 'NO',
              children: [
                { id: 'amnesia_yes', label: 'Extended Observation with Delayed CT if Symptoms Persist', type: 'leaf', edgeLabel: 'YES', data: { priority: 'Medium', confidence: 0.78 } },
                { id: 'amnesia_no', label: 'Safe for Discharge with Head Injury Advice Sheet', type: 'leaf', edgeLabel: 'NO', data: { priority: 'Low', confidence: 0.92 } },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'no_trauma',
      label: 'Is there loss of consciousness or persistent symptoms?',
      type: 'decision',
      edgeLabel: 'NO',
      children: [
        {
          id: 'loc_yes',
          label: 'Does SCAT5 concussion assessment indicate abnormality?',
          type: 'decision',
          edgeLabel: 'YES',
          children: [
            {
              id: 'scat_abnormal',
              label: 'Is there a focal neurological deficit on examination?',
              type: 'decision',
              edgeLabel: 'YES',
              children: [
                { id: 'focal_deficit', label: 'Urgent CT Scan and Neurology Referral', type: 'leaf', edgeLabel: 'YES', data: { priority: 'High', confidence: 0.93 } },
                { id: 'no_focal', label: 'Structured Concussion Management Protocol', type: 'leaf', edgeLabel: 'NO', data: { priority: 'Medium', confidence: 0.86 } },
              ],
            },
            {
              id: 'scat_normal',
              label: 'Are symptoms resolving within 15 minutes?',
              type: 'decision',
              edgeLabel: 'NO',
              children: [
                { id: 'resolving', label: 'Gradual Return-to-Activity Protocol', type: 'leaf', edgeLabel: 'YES', data: { priority: 'Low', confidence: 0.89 } },
                { id: 'not_resolving', label: 'Extended Monitoring and Follow-Up Clinic Referral', type: 'leaf', edgeLabel: 'NO', data: { priority: 'Medium', confidence: 0.81 } },
              ],
            },
          ],
        },
        {
          id: 'loc_no',
          label: 'Has the patient been on anticoagulant therapy?',
          type: 'decision',
          edgeLabel: 'NO',
          children: [
            { id: 'anticoag_yes', label: 'CT Head Scan and Coagulation Studies Required', type: 'leaf', edgeLabel: 'YES', data: { priority: 'High', confidence: 0.94 } },
            {
              id: 'anticoag_no',
              label: 'Is the patient age 65 or older?',
              type: 'decision',
              edgeLabel: 'NO',
              children: [
                { id: 'elderly', label: 'Lower Threshold for CT: Consider Imaging', type: 'chance', edgeLabel: 'YES', data: { probability: 0.4 } },
                { id: 'young', label: 'Continue Standard Trauma Assessment Protocol', type: 'leaf', edgeLabel: 'NO', data: { priority: 'Low', confidence: 0.96 } },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function flattenTree(
  def: TreeDef,
  parentId: string | undefined,
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  edgeLabel?: string,
  depth = 0,
) {
  const { width: nodeWidth, height: nodeHeight } = computeNodeDimensions(def.label);

  const hasChildren = (def.children || []).length > 0;

  const node: GraphNode = {
    id: def.id,
    label: def.label,
    type: def.type,
    parentId,
    children: (def.children || []).map((c) => c.id),
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    width: nodeWidth,
    height: nodeHeight,
    collapsed: hasChildren && depth >= 1,
    data: def.data,
  };
  nodes.set(def.id, node);

  if (parentId) {
    edges.push({
      id: `${parentId}->${def.id}`,
      source: parentId,
      target: def.id,
      label: edgeLabel,
      points: [],
    });
  }

  if (def.children) {
    for (const child of def.children) {
      flattenTree(child, def.id, nodes, edges, child.edgeLabel, depth + 1);
    }
  }
}

export function createSampleTree(): { nodes: Map<string, GraphNode>; edges: GraphEdge[]; rootId: string } {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  flattenTree(treeDef, undefined, nodes, edges);
  return { nodes, edges, rootId: 'root' };
}
