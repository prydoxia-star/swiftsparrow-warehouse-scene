import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, Vector3 } from "three";

export interface CameraControlsApi {
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (wheelDelta: number) => void;
}

interface CameraRigProps {
  controlsRef: MutableRefObject<CameraControlsApi | null>;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function CameraRig({ controlsRef }: CameraRigProps) {
  const { camera } = useThree();
  const target = useRef(new Vector3(0, 0.15, 0));
  const zoom = useRef(30);
  const cameraOffset = useMemo(() => new Vector3(1, 0.94, 1).normalize(), []);

  useEffect(() => {
    const orthoCamera = camera as OrthographicCamera;
    orthoCamera.zoom = zoom.current;
    orthoCamera.near = 0.1;
    orthoCamera.far = 180;
    orthoCamera.updateProjectionMatrix();
    camera.position.copy(target.current).addScaledVector(cameraOffset, 42);
    camera.up.set(0, 1, 0);
    camera.lookAt(target.current);

    controlsRef.current = {
      pan(deltaX, deltaY) {
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const screenUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        right.y = 0;
        screenUp.y = 0;
        right.normalize();
        screenUp.normalize();

        const worldPerPixel = 0.95 / zoom.current;
        target.current
          .addScaledVector(right, -deltaX * worldPerPixel)
          .addScaledVector(screenUp, deltaY * worldPerPixel);
        target.current.x = clamp(target.current.x, -9.5, 9.5);
        target.current.z = clamp(target.current.z, -6.5, 6.5);
      },
      zoom(wheelDelta) {
        zoom.current = clamp(zoom.current - wheelDelta * 0.018, 19, 43);
        orthoCamera.zoom = zoom.current;
        orthoCamera.updateProjectionMatrix();
      },
    };

    return () => {
      controlsRef.current = null;
    };
  }, [camera, cameraOffset, controlsRef]);

  useFrame(() => {
    camera.position.copy(target.current).addScaledVector(cameraOffset, 42);
    camera.lookAt(target.current);
  });

  return null;
}
