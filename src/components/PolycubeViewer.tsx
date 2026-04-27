import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Polycube } from '../lib/geometry'
import { getBounds3D, normalizeCubes } from '../lib/geometry'
import { ROTATIONS_24, rotatePolycube } from '../lib/rotations'

type PolycubeViewerProps = {
  cubes: Polycube
  displayRotationIndex: number
}

export function PolycubeViewer({ cubes, displayRotationIndex }: PolycubeViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf7f4ef)

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.75
    controls.minDistance = 4
    controls.maxDistance = 18

    const ambient = new THREE.HemisphereLight(0xffffff, 0xd6c5a1, 2.2)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5)
    keyLight.position.set(4, 7, 6)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x6cc7c3, 0.85)
    fillLight.position.set(-5, 3, -4)
    scene.add(fillLight)

    const group = new THREE.Group()
    const rotation = ROTATIONS_24[displayRotationIndex]
    const rotated = normalizeCubes(rotatePolycube(cubes, rotation))
    const bounds = getBounds3D(rotated)
    const center = new THREE.Vector3(
      (bounds.width - 1) / 2,
      (bounds.height - 1) / 2,
      (bounds.depth - 1) / 2,
    )

    const geometry = new THREE.BoxGeometry(0.96, 0.96, 0.96)
    const edgeGeometry = new THREE.EdgesGeometry(geometry)

    for (const cube of rotated) {
      const hue = ((cube.x * 37 + cube.y * 67 + cube.z * 97) % 360) / 360
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.58, 0.55),
        roughness: 0.52,
        metalness: 0.04,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(cube.x - center.x, cube.y - center.y, cube.z - center.z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)

      const edges = new THREE.LineSegments(
        edgeGeometry,
        new THREE.LineBasicMaterial({ color: 0x1f2933, transparent: true, opacity: 0.72 }),
      )
      edges.position.copy(mesh.position)
      group.add(edges)
    }

    group.rotation.set(-0.48, 0.66, 0.1)
    scene.add(group)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.ShadowMaterial({ color: 0x25414a, opacity: 0.18 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -bounds.height / 2 - 0.62
    floor.receiveShadow = true
    scene.add(floor)

    const maxDimension = Math.max(bounds.width, bounds.height, bounds.depth)
    const cameraDistance = Math.max(5, maxDimension * 1.8)
    camera.position.set(cameraDistance, cameraDistance * 0.78, cameraDistance)
    controls.target.set(0, 0, 0)
    camera.lookAt(controls.target)

    const resize = () => {
      const rect = mount.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    let animationFrame = 0
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      controls.dispose()
      geometry.dispose()
      edgeGeometry.dispose()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of materials) {
            material.dispose()
          }
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [cubes, displayRotationIndex])

  return <div className="polycube-viewer" ref={mountRef} aria-label="3D polycube viewer" />
}
