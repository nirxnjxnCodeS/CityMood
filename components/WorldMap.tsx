'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { mesh, feature } from 'topojson-client'
import { geoEquirectangular, geoPath } from 'd3'
import { City, CONTINENTS } from '@/lib/cities'
import { MoodData } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const worldAtlas = require('world-atlas/countries-110m.json')

// ─── Constants ────────────────────────────────────────────────────────────────

// ISO 3166-1 alpha-2 → numeric (world-atlas country IDs)
const COUNTRY_NUMERIC: Record<string, string> = {
  IN: '356', GB: '826', US: '840', JP: '392', AE: '784',
  DE: '276', AU: '36',  BR: '76',  NG: '566', CA: '124',
  FR: '250', NL: '528', ES: '724', IT: '380', SE: '752',
  AT: '40',  PL: '616', BE: '56',  CH: '756', SG: '702',
  TH: '764', KR: '410', CN: '156', HK: '344', MY: '458',
  ID: '360', PK: '586', EG: '818', KE: '404', ZA: '710',
  SA: '682', TR: '792', NZ: '554', MX: '484', AR: '32',
  CO: '170', PE: '604',
}

const MAJOR_CITIES = new Set([
  'london', 'tokyo', 'new-york', 'mumbai', 'sao-paulo',
  'sydney', 'dubai', 'berlin', 'paris', 'singapore', 'seoul', 'beijing',
  'los-angeles', 'toronto', 'delhi', 'shanghai', 'jakarta',
])

// ─── Types ────────────────────────────────────────────────────────────────────

interface CityMeshData {
  dot:            THREE.Mesh
  dotMat:         THREE.MeshPhongMaterial
  hitbox:         THREE.Mesh   // invisible larger click target
  ring:           THREE.Mesh
  ringMat:        THREE.MeshBasicMaterial
  labelEl:        HTMLDivElement
  targetColor:    THREE.Color
  currentColor:   THREE.Color
  alertFlashUntil: number
  pulseOffset:    number
}

interface TooltipData {
  cityId: string
  data:   MoodData
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

function moodColorHex(score: number): string {
  if (score > 0.05)  return '#00ff88'
  if (score < -0.05) return '#ff4444'
  return '#888888'
}

function moodLabel(score: number): string {
  if (score > 0.2)  return 'Vibing ✦'
  if (score > 0.05) return 'Upbeat'
  if (score < -0.2) return 'Tense'
  if (score < -0.05) return 'Edgy'
  return 'Calm'
}

function latLonToVec3(lat: number, lon: number, r = 2): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

function computeSunDir(): THREE.Vector3 {
  const now        = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear  = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000)
  const decl       = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180)
  const hourAngle  = (now.getUTCHours() + now.getUTCMinutes() / 60) * 15 - 180
  return latLonToVec3(decl, -hourAngle, 1).normalize()
}

function buildRandomStars(): THREE.Points {
  const pos = new Float32Array(2000 * 3)
  for (let i = 0; i < 2000; i++) {
    const r = 80 + Math.random() * 40
    const t = Math.random() * Math.PI * 2
    const p = Math.acos(2 * Math.random() - 1)
    pos[i * 3]     = r * Math.sin(p) * Math.cos(t)
    pos[i * 3 + 1] = r * Math.cos(p)
    pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t)
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return new THREE.Points(geom, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8, sizeAttenuation: true }))
}

function buildTerminatorLine(sunDir: THREE.Vector3): THREE.Line {
  const s  = sunDir.clone().normalize()
  const up = Math.abs(s.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const u  = new THREE.Vector3().crossVectors(up, s).normalize()
  const v  = new THREE.Vector3().crossVectors(s, u).normalize()
  const N  = 128, r = 2.005
  const pts = new Float32Array((N + 1) * 3)
  for (let i = 0; i <= N; i++) {
    const θ = (i / N) * Math.PI * 2
    pts[i * 3]     = (Math.cos(θ) * u.x + Math.sin(θ) * v.x) * r
    pts[i * 3 + 1] = (Math.cos(θ) * u.y + Math.sin(θ) * v.y) * r
    pts[i * 3 + 2] = (Math.cos(θ) * u.z + Math.sin(θ) * v.z) * r
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(pts, 3))
  return new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }))
}

function buildHeatmapTexture(countryScores: Map<string, number>): THREE.CanvasTexture {
  const W = 2048, H = 1024
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  const proj = geoEquirectangular().scale(H / Math.PI).translate([W / 2, H / 2])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const path = geoPath(proj as any, ctx as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countries = (feature(worldAtlas as any, (worldAtlas as any).objects.countries) as any).features

  for (const f of countries) {
    const score = countryScores.get(String(f.id))
    if (score === undefined) continue
    let color: string
    if      (score > 0.2)   color = 'rgba(0,255,136,0.60)'
    else if (score > 0.05)  color = 'rgba(0,204,102,0.40)'
    else if (score < -0.2)  color = 'rgba(255,34,34,0.60)'
    else if (score < -0.05) color = 'rgba(255,102,68,0.40)'
    else                    color = 'rgba(68,85,102,0.30)'
    ctx.fillStyle = color
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(path as any)(f)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function buildBorderLines(): THREE.LineSegments {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const borders = mesh(worldAtlas, worldAtlas.objects.countries) as any
  const verts: number[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  borders.coordinates.forEach((line: any[]) => {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i]
      const [lon2, lat2] = line[i + 1]
      const v1 = latLonToVec3(lat1, lon1, 2.002)
      const v2 = latLonToVec3(lat2, lon2, 2.002)
      verts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z)
    }
  })
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  return new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 1.0 }))
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  cities:           City[]
  onScoreUpdate?:   (cityId: string, score: number) => void
  onCityClick?:     (cityId: string, data: MoodData) => void
  onBgClick?:       () => void
  activeFilter?:    string
  heatmapActive?:   boolean
  continentFilter?: string
  flyTo?:           { lat: number; lon: number; distance?: number } | null
}

export default function WorldMap({ cities, onScoreUpdate, onCityClick, onBgClick, activeFilter, heatmapActive, continentFilter, flyTo }: Props) {
  const mountRef    = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const css2DRef    = useRef<CSS2DRenderer | null>(null)
  const sceneRef    = useRef<THREE.Scene | null>(null)
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const cityMeshesRef  = useRef<Map<string, CityMeshData>>(new Map())
  const cityDataRef    = useRef<Map<string, MoodData>>(new Map())
  const hoveredIdRef   = useRef<string | null>(null)
  const frameIdRef     = useRef<number>(0)
  const rotTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstDataRef   = useRef<Set<string>>(new Set())

  // Sun / night-side refs
  const sunDirRef         = useRef<THREE.Vector3>(computeSunDir())
  const terminatorLineRef = useRef<THREE.Line | null>(null)
  const sunLightRef       = useRef<THREE.DirectionalLight | null>(null)

  // Always-current copy of the cities list for fallback panel data
  const citiesRef = useRef(cities)
  useEffect(() => { citiesRef.current = cities }, [cities])

  // Heatmap refs
  const heatmapMeshRef     = useRef<THREE.Mesh | null>(null)
  const heatmapTexRef      = useRef<THREE.CanvasTexture | null>(null)
  const heatmapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Stable refs so closures always call the latest callbacks
  const onCityClickRef      = useRef(onCityClick)
  const onBgClickRef        = useRef(onBgClick)
  const activeFilterRef     = useRef(activeFilter ?? 'all')
  const continentFilterRef  = useRef(continentFilter ?? '')
  useEffect(() => { onCityClickRef.current     = onCityClick },            [onCityClick])
  useEffect(() => { onBgClickRef.current       = onBgClick },              [onBgClick])
  useEffect(() => { activeFilterRef.current    = activeFilter ?? 'all' },  [activeFilter])
  useEffect(() => { continentFilterRef.current = continentFilter ?? '' },  [continentFilter])

  // Fly to the best-matching city when filter changes
  useEffect(() => {
    if (!activeFilter || activeFilter === 'all') return
    const camera   = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const sunDir = sunDirRef.current
    let bestPos: THREE.Vector3 | null = null
    let bestValue = -Infinity

    cityMeshesRef.current.forEach((cm, cityId) => {
      const data = cityDataRef.current.get(cityId)
      if (!data) return
      const dotDir    = cm.dot.position.clone().normalize()
      const nightSide = dotDir.dot(sunDir) < 0

      let matches = false
      let value   = 0
      if      (activeFilter === 'vibing') { matches = data.score > 0.05;  value = data.score }
      else if (activeFilter === 'calm')   { matches = Math.abs(data.score) <= 0.05; value = -Math.abs(data.score) }
      else if (activeFilter === 'tense')  { matches = data.score < -0.05; value = -data.score }
      else if (activeFilter === 'night')  { matches = nightSide;          value = -dotDir.dot(sunDir) }

      if (matches && value > bestValue) {
        bestValue = value
        bestPos   = cm.dot.position.clone()
      }
    })

    if (bestPos) {
      cameraAnimRef.current = {
        startPos: camera.position.clone(),
        endPos:   (bestPos as THREE.Vector3).normalize().multiplyScalar(4.5),
        startAt:  Date.now(),
        duration: 1200,
      }
      controls.autoRotate = false
    }
  }, [activeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to explicit lat/lon (continent zoom)
  useEffect(() => {
    if (!flyTo) return
    const camera   = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    const dist   = flyTo.distance ?? 4.5
    const target = latLonToVec3(flyTo.lat, flyTo.lon, dist)
    cameraAnimRef.current = {
      startPos: camera.position.clone(),
      endPos:   target,
      startAt:  Date.now(),
      duration: 1400,
    }
    controls.autoRotate = false
  }, [flyTo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Heatmap: build/rebuild texture when active, tear down when inactive
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const rebuild = () => {
      // Accumulate sum+count per country so multi-city countries (India, USA, China…) get a true average
      const accum = new Map<string, { sum: number; n: number }>()
      citiesRef.current.forEach(city => {
        const numId = COUNTRY_NUMERIC[city.country]
        if (!numId) return
        const data = cityDataRef.current.get(city.id)
        if (!data) return
        const prev = accum.get(numId) ?? { sum: 0, n: 0 }
        accum.set(numId, { sum: prev.sum + data.score, n: prev.n + 1 })
      })
      const countryScores = new Map<string, number>()
      accum.forEach(({ sum, n }, id) => countryScores.set(id, sum / n))

      if (heatmapTexRef.current) heatmapTexRef.current.dispose()
      const tex = buildHeatmapTexture(countryScores)
      heatmapTexRef.current = tex

      if (heatmapMeshRef.current) {
        ;(heatmapMeshRef.current.material as THREE.MeshBasicMaterial).map = tex
        ;(heatmapMeshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true
      } else {
        const heatMesh = new THREE.Mesh(
          new THREE.SphereGeometry(2.001, 64, 64),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
        )
        scene.add(heatMesh)
        heatmapMeshRef.current = heatMesh
      }
    }

    if (!heatmapActive) {
      if (heatmapIntervalRef.current) clearInterval(heatmapIntervalRef.current)
      if (heatmapMeshRef.current) { scene.remove(heatmapMeshRef.current); heatmapMeshRef.current = null }
      if (heatmapTexRef.current)  { heatmapTexRef.current.dispose();      heatmapTexRef.current  = null }
      return
    }

    rebuild()
    heatmapIntervalRef.current = setInterval(rebuild, 60_000)
    return () => {
      if (heatmapIntervalRef.current) clearInterval(heatmapIntervalRef.current)
    }
  }, [heatmapActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const cameraAnimRef = useRef<{
    startPos: THREE.Vector3; endPos: THREE.Vector3
    startAt: number; duration: number
  } | null>(null)

  const [tooltipData, setTooltipData]       = useState<TooltipData | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [connectedCount, setConnectedCount] = useState(0)
  const [loadingDone, setLoadingDone]       = useState(false)

  // Loading screen timeout — gives up after 10s regardless
  useEffect(() => {
    const t = setTimeout(() => setLoadingDone(true), 10_000)
    return () => clearTimeout(t)
  }, [])

  // ── Scene setup (once) ────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = mount.clientWidth
    const H = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#050510')
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000)
    camera.position.set(0, 0, 6)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x050510, 1)
    renderer.setClearAlpha(1)
    renderer.domElement.style.background = '#050510'
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const css2D = new CSS2DRenderer()
    css2D.setSize(W, H)
    css2D.domElement.style.position    = 'absolute'
    css2D.domElement.style.top         = '0'
    css2D.domElement.style.left        = '0'
    css2D.domElement.style.pointerEvents = 'none'
    mount.appendChild(css2D.domElement)
    css2DRef.current = css2D

    // ── Lights ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.08))
    scene.add(new THREE.HemisphereLight(0x0a1628, 0x000510, 0.15))

    const sunDir   = sunDirRef.current
    const sunLight = new THREE.DirectionalLight(0xfffaea, 1.2)
    sunLight.position.copy(sunDir.clone().multiplyScalar(10))
    scene.add(sunLight)
    sunLightRef.current = sunLight

    // ── Star field ──────────────────────────────────────────────────────────
    scene.add(buildRandomStars())

    // ── Globe surface ────────────────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(2, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x0a1f3d, shininess: 15 }),
    ))

    scene.add(buildBorderLines())

    // ── Day/Night terminator line ────────────────────────────────────────────
    const termLine = buildTerminatorLine(sunDir)
    scene.add(termLine)
    terminatorLineRef.current = termLine

    // ── Atmosphere glow ──────────────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.15, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x4488ff, transparent: true, opacity: 0.08, side: THREE.BackSide }),
    ))

    // ── Sun update every 60s ─────────────────────────────────────────────────
    const sunUpdateTimer = setInterval(() => {
      const newDir = computeSunDir()
      sunDirRef.current.copy(newDir)
      sunLight.position.copy(newDir.clone().multiplyScalar(10))
      // Rebuild terminator line at new sun position
      if (terminatorLineRef.current) scene.remove(terminatorLineRef.current)
      const newLine = buildTerminatorLine(newDir)
      scene.add(newLine)
      terminatorLineRef.current = newLine
    }, 60_000)

    // ── OrbitControls ────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping   = true
    controls.dampingFactor   = 0.05
    controls.autoRotate      = true
    controls.autoRotateSpeed = 0.4
    controls.minDistance     = 3
    controls.maxDistance     = 10
    controls.enablePan       = false
    controlsRef.current = controls

    const onDown = () => {
      controls.autoRotate = false
      if (rotTimerRef.current) clearTimeout(rotTimerRef.current)
      rotTimerRef.current = setTimeout(() => { controls.autoRotate = true }, 3000)
    }
    renderer.domElement.addEventListener('mousedown', onDown)

    // ── Raycaster (hover) ────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const m2        = new THREE.Vector2()

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      m2.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      m2.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
      raycaster.setFromCamera(m2, camera)

      // Use hitboxes (3× larger) for reliable hover detection
      const hitboxes = Array.from(cityMeshesRef.current.values()).map(cm => cm.hitbox)
      const hits = raycaster.intersectObjects(hitboxes)

      if (hits.length > 0) {
        const id = hits[0].object.userData.cityId as string

        // Only register hover for cities facing the camera (front hemisphere)
        const cm = cityMeshesRef.current.get(id)
        const isFront = cm
          ? cm.dot.position.clone().normalize().dot(camera.position.clone().normalize()) > 0
          : false

        if (isFront) {
          hoveredIdRef.current = id
          renderer.domElement.style.cursor = 'pointer'
          const data = cityDataRef.current.get(id)
          if (data) { setTooltipData({ cityId: id, data }); setTooltipVisible(true) }
        } else {
          hoveredIdRef.current = null
          renderer.domElement.style.cursor = 'default'
          setTooltipVisible(false)
        }
      } else {
        hoveredIdRef.current = null
        renderer.domElement.style.cursor = 'default'
        setTooltipVisible(false)
      }
    }
    renderer.domElement.addEventListener('mousemove', onMove)

    // ── Click → fly-to + open panel (or close panel when clicking empty globe) ─
    const onClick = () => {
      const id = hoveredIdRef.current
      if (!id) { onBgClickRef.current?.(); return }
      const cm = cityMeshesRef.current.get(id)
      if (!cm) return
      cameraAnimRef.current = {
        startPos: camera.position.clone(),
        endPos:   cm.dot.position.clone().normalize().multiplyScalar(4.5),
        startAt:  Date.now(),
        duration: 1200,
      }
      controls.autoRotate = false

      // Open panel with live data if available, fallback to city metadata if SSE hasn't arrived yet
      const data = cityDataRef.current.get(id)
      const cityMeta = citiesRef.current.find(c => c.id === id)
      const panelData = data ?? {
        score:        0,
        headlines:    [],
        redditTitles: [],
        weatherDesc:  'Loading…',
        cityId:       id,
        cityName:     cityMeta?.name ?? id,
        ts:           Date.now(),
      }
      console.log('[WorldMap] city clicked:', id, 'score:', panelData.score, 'hasSSEData:', !!data)
      onCityClickRef.current?.(id, panelData)
    }
    renderer.domElement.addEventListener('click', onClick)

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      css2D.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ── Animation loop ───────────────────────────────────────────────────────
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      const now    = Date.now()
      const sunDir = sunDirRef.current

      if (cameraAnimRef.current) {
        const { startPos, endPos, startAt, duration } = cameraAnimRef.current
        const t = Math.min((now - startAt) / duration, 1)
        camera.position.lerpVectors(startPos, endPos, 1 - Math.pow(1 - t, 3))
        if (t >= 1) cameraAnimRef.current = null
      }

      const camDir  = camera.position.clone().normalize()
      const camDist = camera.position.length()

      cityMeshesRef.current.forEach(cm => {
        const cityId  = cm.dot.userData.cityId as string
        const dotDir  = cm.dot.position.clone().normalize()
        const facing  = dotDir.dot(camDir) > 0
        const nightSide = dotDir.dot(sunDir) < 0

        // Zoom-based label visibility (Prompt 4)
        const showLabel = facing && (
          camDist < 4.5
            ? true
            : camDist < 5.5
              ? MAJOR_CITIES.has(cityId)
              : false
        )

        cm.dot.visible  = facing
        cm.ring.visible = facing
        cm.labelEl.style.opacity = showLabel ? '1' : '0'

        if (!facing) return

        // Filter opacity (mood filter + continent filter)
        const filter    = activeFilterRef.current
        const continent = continentFilterRef.current
        let targetOpacity = 1

        if (continent) {
          const inContinent = CONTINENTS[continent]?.includes(cityId) ?? false
          targetOpacity = inContinent ? 1 : 0.12
        } else if (filter !== 'all') {
          const cityScore = cityDataRef.current.get(cityId)?.score ?? 0
          let matches = false
          if      (filter === 'vibing') matches = cityScore > 0.05
          else if (filter === 'calm')   matches = cityScore >= -0.05 && cityScore <= 0.05
          else if (filter === 'tense')  matches = cityScore < -0.05
          else if (filter === 'night')  matches = nightSide
          targetOpacity = matches ? 1 : 0.15
        }
        cm.dotMat.opacity += (targetOpacity - cm.dotMat.opacity) * 0.1

        // Pulse ring
        const t = ((now / 1500) + cm.pulseOffset / 2) % 1
        cm.ring.scale.setScalar(1 + t * 0.7)
        cm.ringMat.opacity = (1 - t) * 0.7 * cm.dotMat.opacity
        cm.ring.quaternion.copy(camera.quaternion)

        // Color lerp
        if (!cm.currentColor.equals(cm.targetColor)) {
          cm.currentColor.lerp(cm.targetColor, 0.05)
          cm.dotMat.emissive.copy(cm.currentColor)
          cm.ringMat.color.copy(cm.currentColor)
        }

        // Emissive intensity: alert flash > night brightness > day normal
        if (now < cm.alertFlashUntil) {
          cm.dotMat.emissiveIntensity = 0.4 + Math.abs(Math.sin((now / 120) * Math.PI)) * 1.2
        } else {
          const targetIntensity = nightSide ? 2.0 : 0.8
          cm.dotMat.emissiveIntensity += (targetIntensity - cm.dotMat.emissiveIntensity) * 0.04
        }

        // Dot scale: city lights from space — slightly bigger on night side
        const targetScale = nightSide ? 1.27 : 1.0
        cm.dot.scale.setScalar(cm.dot.scale.x + (targetScale - cm.dot.scale.x) * 0.04)
      })

      controls.update()
      renderer.render(scene, camera)
      css2D.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
      clearInterval(sunUpdateTimer)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('mousedown', onDown)
      renderer.domElement.removeEventListener('mousemove', onMove)
      renderer.domElement.removeEventListener('click', onClick)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      if (mount.contains(css2D.domElement))    mount.removeChild(css2D.domElement)
      if (rotTimerRef.current) clearTimeout(rotTimerRef.current)
      cityMeshesRef.current.clear()
      firstDataRef.current.clear()
      sceneRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── City dots ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    cities.forEach((city, i) => {
      if (cityMeshesRef.current.has(city.id)) return
      const pos   = latLonToVec3(city.lat, city.lon, 2)
      const color = new THREE.Color('#ffffff')

      const dotMat = new THREE.MeshPhongMaterial({
        color:             new THREE.Color(0x000000),
        emissive:          color.clone(),
        emissiveIntensity: 0.8,
        transparent:       true,
        opacity:           1,
      })
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 16), dotMat)
      dot.position.copy(pos)
      dot.userData.cityId = city.id
      dot.renderOrder = 2
      scene.add(dot)

      // Invisible hitbox — 3× larger than the visible dot for easy clicking
      const hitbox = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      )
      hitbox.position.copy(pos)
      hitbox.userData.cityId = city.id
      scene.add(hitbox)

      const labelEl = document.createElement('div')
      labelEl.textContent = city.name
      Object.assign(labelEl.style, {
        color:         'rgba(255,255,255,0.85)',
        fontSize:      '9px',
        fontWeight:    '600',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        pointerEvents: 'none',
        opacity:       '0',
        transition:    'opacity 200ms',
        whiteSpace:    'nowrap',
        textShadow:    '0 1px 4px rgba(0,0,0,0.9)',
        marginTop:     '3px',
      })
      const labelObj = new CSS2DObject(labelEl)
      labelObj.position.set(0, 0.07, 0)
      dot.add(labelObj)

      const ringMat = new THREE.MeshBasicMaterial({
        color:       color.clone(),
        transparent: true,
        opacity:     0.8,
        side:        THREE.DoubleSide,
        depthTest:   false,
        depthWrite:  false,
      })
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.025, 0.035, 32), ringMat)
      ring.position.copy(pos)
      ring.renderOrder = 999
      scene.add(ring)

      cityMeshesRef.current.set(city.id, {
        dot, dotMat, hitbox, ring, ringMat, labelEl,
        targetColor:     color.clone(),
        currentColor:    color.clone(),
        alertFlashUntil: 0,
        pulseOffset:     (city.index ?? i) * 0.5,
      })
    })

    // Per-city SSE
    const sources = cities.map(city => {
      const es = new EventSource(`/api/stream/${city.id}`)
      es.onmessage = e => {
        try {
          const data: MoodData = JSON.parse(e.data)
          cityDataRef.current.set(city.id, data)
          onScoreUpdate?.(city.id, data.score)
          const cm = cityMeshesRef.current.get(city.id)
          if (cm) cm.targetColor.setStyle(moodColorHex(data.score))
          if (!firstDataRef.current.has(city.id)) {
            firstDataRef.current.add(city.id)
            setConnectedCount(prev => {
              const next = prev + 1
              // Show globe once 60% of cities have connected (handles large city counts)
              if (next >= Math.ceil(cities.length * 0.6)) setLoadingDone(true)
              return next
            })
          }
          if (hoveredIdRef.current === city.id)
            setTooltipData({ cityId: city.id, data })
        } catch { /* ignore */ }
      }
      return es
    })

    // Alert SSE — flash the affected city dot
    const alertEs = new EventSource('/api/alerts')
    alertEs.onmessage = e => {
      try {
        const alert = JSON.parse(e.data)
        const cm = cityMeshesRef.current.get(alert.cityId)
        if (cm) cm.alertFlashUntil = Date.now() + 1500
      } catch { /* ignore */ }
    }

    return () => {
      sources.forEach(es => es.close())
      alertEs.close()
    }
  }, [cities]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────
  const city    = tooltipData ? cities.find(c => c.id === tooltipData.cityId) : null
  const s       = tooltipData?.data.score ?? 0
  const moodCol = s > 0.05 ? '#22c55e' : s < -0.05 ? '#ef4444' : '#71717a'
  const loading = !loadingDone && connectedCount < cities.length

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 80px)', minHeight: 400, background: '#050510', backgroundColor: '#050510' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', background: '#050510' }} />

      {/* Loading overlay */}
      <div
        style={{
          position:       'absolute',
          inset:          0,
          background:     '#050510',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          opacity:        loading ? 1 : 0,
          transition:     'opacity 800ms ease',
          pointerEvents:  loading ? 'all' : 'none',
          zIndex:         10,
        }}
      >
        <div style={{
          width:        48,
          height:       48,
          border:       '2px solid #4488ff33',
          borderTop:    '2px solid #4488ff',
          borderRadius: '50%',
          animation:    'spin 1s linear infinite',
          marginBottom: 16,
        }} />
        <p style={{ color: '#4488ff', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Connecting · {connectedCount}/{cities.length}
        </p>
      </div>

      {/* Heatmap legend */}
      {heatmapActive && (
        <div style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 20,
          background: 'rgba(5,5,20,0.9)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(8px)',
        }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 8 }}>
            Mood Heatmap
          </p>
          {[
            { color: '#00ff88', label: 'Vibing',  range: '> +0.20' },
            { color: '#00cc66', label: 'Upbeat',  range: '> +0.05' },
            { color: '#445566', label: 'Calm',    range: '± 0.05'  },
            { color: '#ff6644', label: 'Edgy',    range: '< −0.05' },
            { color: '#ff2222', label: 'Tense',   range: '< −0.20' },
          ].map(({ color, label, range }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block', opacity: 0.8 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', width: 44 }}>{label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{range}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-none z-30 rounded-xl p-3 shadow-2xl"
        style={{
          top:            16,
          right:          16,
          width:          240,
          background:     'rgba(5,5,20,0.96)',
          border:         `1px solid ${moodCol}`,
          backdropFilter: 'blur(8px)',
          boxShadow:      `0 0 20px ${moodCol}40`,
          opacity:        tooltipVisible && city ? 1 : 0,
          transition:     'opacity 150ms ease',
        }}
      >
        {city && tooltipData && (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-sm text-white">{city.flag} {city.name}</span>
              <span className="text-xs font-medium" style={{ color: moodCol }}>
                {moodLabel(s)}&nbsp;{s >= 0 ? '+' : ''}{s.toFixed(2)}
              </span>
            </div>
            {tooltipData.data.weatherDesc && (
              <p className="text-xs text-zinc-500 capitalize mb-1.5">{tooltipData.data.weatherDesc}</p>
            )}
            <ul className="space-y-1">
              {tooltipData.data.headlines.slice(0, 2).map((h, i) => (
                <li key={i} className="text-xs text-zinc-400 leading-snug line-clamp-2 border-l border-zinc-700 pl-1.5">{h}</li>
              ))}
            </ul>
            <p className="text-xs text-zinc-600 mt-1.5">Click to open details</p>
          </>
        )}
      </div>
    </div>
  )
}
