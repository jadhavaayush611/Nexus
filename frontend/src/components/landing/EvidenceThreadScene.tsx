import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { StaticEvidenceDiagram } from './StaticEvidenceDiagram.tsx';
import './EvidenceThreadScene.css';

interface EvidenceThreadSceneProps {
  scrollProgress: number; // 0.0 to 1.0
  className?: string;
}

export const EvidenceThreadScene: React.FC<EvidenceThreadSceneProps> = ({
  scrollProgress,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cardAGroupRef = useRef<THREE.Group | null>(null);
  const cardBGroupRef = useRef<THREE.Group | null>(null);
  const anchorMeshRef = useRef<THREE.Mesh | null>(null);
  const threadMeshRef = useRef<THREE.Mesh | null>(null);
  const threadGeoRef = useRef<THREE.TubeGeometry | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const targetProgressRef = useRef<number>(scrollProgress);
  const currentProgressRef = useRef<number>(scrollProgress);

  // Keep targetProgressRef updated
  useEffect(() => {
    targetProgressRef.current = Math.min(1, Math.max(0, scrollProgress));
  }, [scrollProgress]);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check WebGL availability
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 420;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F4F6F5');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0, 8.8);
    cameraRef.current = camera;

    // 2. Renderer setup
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'default',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      rendererRef.current = renderer;
    } catch {
      setHasWebGL(false);
      return;
    }

    // 3. Lighting (Restrained, soft, non-neon)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(-4, 6, 6);
    scene.add(dirLight);

    // 4. Materials based on tokens
    const cardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
    });
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0xa8b8bd });
    const navyMaterial = new THREE.MeshStandardMaterial({
      color: 0x172b36,
      roughness: 0.6,
      metalness: 0.1,
    });
    const tealMaterial = new THREE.MeshStandardMaterial({
      color: 0x146b62,
      roughness: 0.5,
      metalness: 0.1,
    });
    const copperMaterial = new THREE.MeshStandardMaterial({
      color: 0xb57a4b,
      roughness: 0.5,
      metalness: 0.1,
    });

    // Helper: Build a clean complaint card panel
    const createCard = (headerColor: number) => {
      const group = new THREE.Group();

      // Base card panel
      const cardGeo = new THREE.BoxGeometry(2.1, 2.9, 0.04);
      const cardMesh = new THREE.Mesh(cardGeo, cardMaterial);
      group.add(cardMesh);

      // Subtle edge borders
      const edges = new THREE.EdgesGeometry(cardGeo);
      const edgeLines = new THREE.LineSegments(edges, borderMaterial);
      group.add(edgeLines);

      // Header strip (identifying bureau ownership)
      const headerGeo = new THREE.PlaneGeometry(2.1, 0.45);
      const headerMat = new THREE.MeshBasicMaterial({ color: headerColor });
      const headerMesh = new THREE.Mesh(headerGeo, headerMat);
      headerMesh.position.set(0, 1.22, 0.025);
      group.add(headerMesh);

      // Evidence node point on the card
      const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const nodeMesh = new THREE.Mesh(nodeGeo, copperMaterial);
      nodeMesh.position.set(0, 0.2, 0.03);
      group.add(nodeMesh);

      return { group, nodeMesh };
    };

    // Card A (Approval Bureau)
    const cardA = createCard(0x146b62);
    scene.add(cardA.group);
    cardAGroupRef.current = cardA.group;

    // Card B (Student Welfare Bureau)
    const cardB = createCard(0xb57a4b);
    scene.add(cardB.group);
    cardBGroupRef.current = cardB.group;

    // 5. Institution Anchor at Top Center
    const anchorGroup = new THREE.Group();
    const anchorGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.18, 32);
    const anchorMesh = new THREE.Mesh(anchorGeo, navyMaterial);
    anchorMesh.rotation.x = Math.PI / 2;
    anchorGroup.add(anchorMesh);

    // Anchor border ring
    const ringGeo = new THREE.TorusGeometry(0.68, 0.02, 16, 48);
    const ringMesh = new THREE.Mesh(ringGeo, tealMaterial);
    anchorGroup.add(ringMesh);

    anchorGroup.position.set(0, 2.1, 0);
    scene.add(anchorGroup);
    anchorMeshRef.current = anchorMesh;

    // 6. The Thread of Evidence (Curve connecting Card A -> Anchor -> Card B)
    const updateThreadGeometry = (p: number) => {
      // Calculate animated control points based on card positions
      const pA = new THREE.Vector3();
      cardA.nodeMesh.getWorldPosition(pA);

      const pAnchor = new THREE.Vector3(0, 1.95, 0);

      const pB = new THREE.Vector3();
      cardB.nodeMesh.getWorldPosition(pB);

      // Midpoints to form a gentle curve
      const midA = new THREE.Vector3(pA.x * 0.4, 0.9, pA.z * 0.4);
      const midB = new THREE.Vector3(pB.x * 0.4, 0.9, pB.z * 0.4);

      const curve = new THREE.CatmullRomCurve3([pA, midA, pAnchor, midB, pB]);
      const newGeo = new THREE.TubeGeometry(curve, 48, 0.03 + p * 0.01, 8, false);

      if (threadMeshRef.current) {
        if (threadGeoRef.current) {
          threadGeoRef.current.dispose();
        }
        threadMeshRef.current.geometry = newGeo;
        threadGeoRef.current = newGeo;
      } else {
        const threadMesh = new THREE.Mesh(newGeo, tealMaterial);
        scene.add(threadMesh);
        threadMeshRef.current = threadMesh;
        threadGeoRef.current = newGeo;
      }
    };

    // 7. Animation Loop with smooth interpolation tied to scroll progress
    const animate = () => {
      // Smooth dampening towards target scroll progress
      const target = targetProgressRef.current;
      const current = currentProgressRef.current;
      const diff = target - current;

      if (Math.abs(diff) > 0.001) {
        currentProgressRef.current += diff * 0.08;
      } else {
        currentProgressRef.current = target;
      }

      const p = currentProgressRef.current;

      // Animate Card A (Interpolate from separated/offset to side-by-side comparison)
      // Beat 1 (p=0): x=-2.1, y=-0.5, rotY=0.25, rotZ=0.06
      // Beat 3 (p=1): x=-1.35, y=-0.2, rotY=0.0, rotZ=0.0
      const cardA_x = -2.1 + p * 0.75;
      const cardA_y = -0.5 + p * 0.3;
      const cardA_z = -0.4 + p * 0.5;
      const cardA_rotY = 0.25 * (1 - p);
      const cardA_rotZ = 0.06 * (1 - p);

      cardA.group.position.set(cardA_x, cardA_y, cardA_z);
      cardA.group.rotation.set(0, cardA_rotY, cardA_rotZ);

      // Animate Card B
      // Beat 1 (p=0): x=2.1, y=-0.7, rotY=-0.28, rotZ=-0.05
      // Beat 3 (p=1): x=1.35, y=-0.2, rotY=0.0, rotZ=0.0
      const cardB_x = 2.1 - p * 0.75;
      const cardB_y = -0.7 + p * 0.5;
      const cardB_z = -0.6 + p * 0.7;
      const cardB_rotY = -0.28 * (1 - p);
      const cardB_rotZ = -0.05 * (1 - p);

      cardB.group.position.set(cardB_x, cardB_y, cardB_z);
      cardB.group.rotation.set(0, cardB_rotY, cardB_rotZ);

      // Recompute thread along moving nodes
      updateThreadGeometry(p);

      // Render
      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 9. Cleanup
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      resizeObserver.disconnect();
      if (threadGeoRef.current) threadGeoRef.current.dispose();
      renderer.dispose();
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || !hasWebGL) {
    // Graceful static fallback
    return (
      <div className={`cw-scene-fallback ${className}`}>
        <StaticEvidenceDiagram
          currentBeat={scrollProgress < 0.33 ? 1 : scrollProgress < 0.66 ? 2 : 3}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`cw-scene-container ${className}`}>
      <canvas ref={canvasRef} className="cw-scene-canvas" aria-hidden="true" />
      <div className="cw-scene-caption">
        <span className="cw-scene-caption__tag">3D Narrative Metaphor</span>
        <span className="cw-scene-caption__text">
          Separate Records Linked via Shared Evidence Thread
        </span>
      </div>
    </div>
  );
};
