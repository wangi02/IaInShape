// --- Pose Analysis Utilities (MediaPipe) ---

import { Landmark } from '../types';

// MediaPipe Pose Landmark Indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

/**
 * Calculate angle between three points (in degrees).
 * Used to detect arm extension.
 */
export const calculateAngle = (a: Landmark, b: Landmark, c: Landmark): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

/**
 * Detect if the user is throwing a Jab.
 * - Arm is extended (elbow angle > 150°)
 * - Wrist is significantly forward (Z-depth)
 */
export const detectJab = (landmarks: Landmark[]): 'left' | 'right' | null => {
  if (!landmarks || landmarks.length < 17) return null;

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

  const JAB_ANGLE_THRESHOLD = 150;
  const JAB_Z_THRESHOLD = -0.15;

  if (leftArmAngle > JAB_ANGLE_THRESHOLD && leftWrist.z < leftShoulder.z + JAB_Z_THRESHOLD) {
    return 'left';
  }
  if (rightArmAngle > JAB_ANGLE_THRESHOLD && rightWrist.z < rightShoulder.z + JAB_Z_THRESHOLD) {
    return 'right';
  }
  return null;
};

/**
 * Detect if the user has a proper Guard position.
 * - Both wrists are near chin level (high Y)
 * - Wrists are close together (small X gap)
 */
export const detectGuard = (landmarks: Landmark[]): boolean => {
  if (!landmarks || landmarks.length < 17) return false;

  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  const wristsHighEnough = leftWrist.y < nose.y + 0.1 && rightWrist.y < nose.y + 0.1;
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const wristGap = Math.abs(rightWrist.x - leftWrist.x);
  const wristsCloseTogether = wristGap < shoulderWidth * 1.2;

  return wristsHighEnough && wristsCloseTogether;
};
